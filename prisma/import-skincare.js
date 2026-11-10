// Skin Care price list (xlsx) → database (Cosmetics › Skin Care) + product photos → S3.
//
//   1) Check only — reads the sheet, prints every row, saves the photos it found locally.
//      Nothing is uploaded and the database is not touched.
//        npx tsx prisma/import-skincare.js "path/to/SkinCare.xlsx" --check
//
//   2) Dry run — same as check, and also connects to the database to show what would be
//      created / updated. Still nothing is written or uploaded.
//        npx tsx prisma/import-skincare.js "path/to/SkinCare.xlsx" --dry-run
//
//   3) Import — uploads photos to S3 (AWS_* in .env, folder jolof/products/skin-care/)
//      and creates / updates the products.
//        npx tsx prisma/import-skincare.js "path/to/SkinCare.xlsx"
//
// Options
//   --sheet "Table 1"      sheet to read (default "Table 1")
//   --hide-out-of-stock    rows marked "Out of stock" are saved with status "hidden"
//   --out <folder>         where check mode writes report.json + photos (default prisma/data/skincare)
//   --department "Cosmetics"  department to put the products in (default: found automatically)
//   --category "Skin Care"    category inside it (created if missing)
//
// Safe to re-run: each row gets a stable id from its name + packaging (skn-<slug>), so a second run
// updates the same products instead of duplicating them. A product keeps its current photo when the
// row has none, and stock, supplier offers, featured flags etc. are never touched.
//
// Needs: npm i -D jszip   (@aws-sdk/client-s3 and @prisma/client are already in the repo)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import JSZip from 'jszip';

// .env (DATABASE_URL, AWS_*) — Node 20.12+ reads it natively
try { process.loadEnvFile?.('.env'); } catch { /* no .env — use the shell environment */ }

// ───────────────────────────────── args ─────────────────────────────────
const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const FILE = argv.find((a, i) => !a.startsWith('--') && !['--sheet', '--out', '--department', '--category'].includes(argv[i - 1]));
const SHEET = opt('--sheet', 'Table 1');
const CHECK = flag('--check');
const DRY = flag('--dry-run');
const HIDE_OOS = flag('--hide-out-of-stock');
const OUT = opt('--out', 'prisma/data/skincare');

const DEPT_ARG = opt('--department', '');           // default: auto (Cosmetics / Beauty …)
const CATEGORY = opt('--category', 'Skin Care');
const SKU_PREFIX = 'JLF-SKN-';
const S3_SUBFOLDER = 'products/skin-care';

if (!FILE) {
  console.error('Usage: npx tsx prisma/import-skincare.js "<file.xlsx>" [--check | --dry-run] [--sheet "Table 1"] [--hide-out-of-stock]');
  process.exit(1);
}

// ──────────────────────────────── helpers ───────────────────────────────
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const slug = (s) => clean(s).toLowerCase().replace(/½/g, 'half').replace(/¼/g, 'quarter').replace(/&/g, 'and')
  .normalize('NFKD').replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex');

/** "$45" | "108" | "$1,250.00" | "$0" | "" → number or null (0 / blank = price on request). */
function parsePrice(raw) {
  const m = clean(raw).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return n > 0 ? Math.round(n * 100) / 100 : null;
}

/** UPC cell: numbers can arrive as 6.156000043821E+12 — always give the full digit string. */
function parseUpc(raw) {
  const t = clean(raw);
  if (/^\d+(\.\d+)?e\+?\d+$/i.test(t)) return Number(t).toFixed(0);
  return t.replace(/\.0+$/, '').replace(/[^\d]/g, '');
}

const UNIT_WORD = { pc: 'pcs', pcs: 'pcs', piece: 'pcs', pieces: 'pcs', bottle: 'bottles', bottles: 'bottles', unit: 'units', units: 'units', jar: 'jars', jars: 'jars', tube: 'tubes', tubes: 'tubes', pack: 'packs', packs: 'packs', bar: 'bars', bars: 'bars' };
const SIZE_RE = /(½|¼|¾|\d+(?:\.\d+)?)\s*(fl\.?\s?oz|fl|oz|ml|ltr|l|kg|g|gr|grams?|lbs?|pounds?)(?![a-z])/i;

/** Packaging "12 bottles 40.6fl oz in a Box" → { pack: "12 bottles", size: "40.6 fl oz" } (size falls back to the name). */
function parsePackaging(packRaw, name) {
  let pack = null;
  let m = packRaw.match(/(\d+)\s*(pcs?|pieces?|bottles?|units?|jars?|tubes?|packs?|bars?)(?![a-z])/i);
  if (m) pack = `${m[1]} ${UNIT_WORD[m[2].toLowerCase()]}`;
  else if ((m = packRaw.match(/[*x×]\s*(\d+)\s*$/i))) pack = `${m[1]} pcs`;

  const fmt = (mm) => `${mm[1]} ${mm[2].replace(/\s+/g, ' ').replace(/^fl(\.?\s?oz)?$/i, 'fl oz')}`.replace(/\s+/g, ' ');
  const inPack = packRaw.replace(m ? m[0] : '', ' ').match(SIZE_RE);
  const inName = name.match(SIZE_RE);
  const size = inPack ? fmt(inPack) : inName ? fmt(inName) : null;
  return { pack, size };
}

// ───────────────────── xlsx reader (cells + photos, no exceljs) ─────────────────────
// Reads the xlsx zip directly so it works whatever made the file (Excel, Google Sheets, LibreOffice,
// PDF→Excel converters — "Table 1" is a converter's sheet name) and also sees in-cell pictures.
const EXT_TYPE = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
function sniff(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'png';
  if (buf.toString('ascii', 0, 4) === 'GIF8') return 'gif';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buf.length > 44 && buf.readUInt32LE(0) === 1 && buf.toString('ascii', 41, 44) === 'EMF') return 'emf';
  if (buf.length > 4 && buf.readUInt32LE(0) === 0x9ac6cdd7) return 'wmf';
  return 'bin';
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unxml = (s) => String(s ?? '').replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => (e[0] === '#'
  ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENT[e] ?? m))
  .replace(/_x([0-9A-F]{4})_/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
// tags may or may not carry a namespace prefix (<xdr:row> vs <row>)
const T = (name) => `(?:[\\w.-]+:)?${name}`;
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s(?:[\\w.-]+:)?${name}="([^"]*)"`)); return m ? unxml(m[1]) : undefined; };
const blocks = (xml, name) => [...(xml || '').matchAll(new RegExp(`<${T(name)}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${T(name)}>)`, 'g'))].map((m) => ({ attrs: m[1], body: m[2] || '' }));
const inner = (xml, name) => { const m = (xml || '').match(new RegExp(`<${T(name)}\\b[^>]*>([\\s\\S]*?)</${T(name)}>`)); return m ? m[1] : undefined; };
// all <t> text, skipping phonetic runs
const textOf = (xml) => [...(xml || '').replace(new RegExp(`<${T('rPh')}\\b[\\s\\S]*?</${T('rPh')}>`, 'g'), '')
  .matchAll(new RegExp(`<${T('t')}\\b[^>]*>([\\s\\S]*?)</${T('t')}>`, 'g'))].map((m) => unxml(m[1])).join('');
const colNum = (letters) => letters.split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
const rels = (xml) => Object.fromEntries(blocks(xml, 'Relationship').map((b) => [attr(`<x${b.attrs}>`, 'Id'), attr(`<x${b.attrs}>`, 'Target')]));
const resolvePart = (base, target) => (target.startsWith('/') ? target.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(base), target)));
const relsPath = (part) => `${path.posix.dirname(part)}/_rels/${path.posix.basename(part)}.rels`;

async function openWorkbook(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const read = async (p) => (zip.file(p) ? zip.file(p).async('string') : null);
  const readBuf = async (p) => (zip.file(p) ? Buffer.from(await zip.file(p).async('nodebuffer')) : null);
  const wbXml = await read('xl/workbook.xml');
  if (!wbXml) throw new Error('Not an .xlsx file (no xl/workbook.xml). If it is .xls or .csv, open it in Excel and "Save As" .xlsx.');
  const wbRels = rels(await read('xl/_rels/workbook.xml.rels'));
  const sheets = blocks(wbXml, 'sheet').map((b) => {
    const tag = `<x${b.attrs}>`;
    return { name: attr(tag, 'name'), part: resolvePart('xl/workbook.xml', wbRels[attr(tag, 'id')]) };
  });
  const shared = blocks(await read('xl/sharedStrings.xml'), 'si').map((b) => textOf(b.body));
  return { zip, read, readBuf, sheets, shared };
}

/** All cells of one sheet → Map("row") → Map(col → { text, error, vm }), plus row heights in points. */
async function readCells(book, part) {
  const xml = await book.read(part);
  const fmt = xml.match(new RegExp(`<${T('sheetFormatPr')}\\b[^>]*>`));
  const defaultHt = Number(fmt && attr(fmt[0], 'defaultRowHeight')) || 15;
  const heights = new Map();
  const rows = new Map();
  let autoRow = 0;
  for (const r of blocks(inner(xml, 'sheetData'), 'row')) {
    const rtag = `<x${r.attrs}>`;
    const rn = Number(attr(rtag, 'r')) || autoRow + 1; autoRow = rn;
    const ht = Number(attr(rtag, 'ht')); if (ht) heights.set(rn, ht);
    const cells = new Map(); let autoCol = 0;
    for (const c of blocks(r.body, 'c')) {
      const ctag = `<x${c.attrs}>`;
      const ref = (attr(ctag, 'r') || '').match(/^([A-Z]+)(\d+)$/);
      const cn = ref ? colNum(ref[1]) : autoCol + 1; autoCol = cn;
      const t = attr(ctag, 't');
      const v = inner(c.body, 'v');
      let text = '';
      if (t === 's') text = book.shared[Number(v)] ?? '';
      else if (t === 'inlineStr') text = textOf(inner(c.body, 'is'));
      else if (t === 'b') text = v === '1' ? 'TRUE' : 'FALSE';
      else text = unxml(v ?? '');
      cells.set(cn, { text, error: t === 'e' ? text : null, vm: attr(ctag, 'vm') });
    }
    rows.set(rn, cells);
  }
  return { rows, rowPt: (r) => heights.get(r) ?? defaultHt };
}

/**
 * Floating pictures (Insert › Pictures). Each is given to the row its vertical centre falls in,
 * so a photo that starts at the bottom edge of the row above still lands on the right product.
 */
async function floatingImages(book, part, rowPt) {
  const EMU_PER_PT = 12700;
  const sheetRels = rels(await book.read(relsPath(part)));
  const out = [];
  const topEmu = (row0, off) => { let pt = 0; for (let r = 1; r <= row0; r++) pt += rowPt(r); return pt * EMU_PER_PT + (Number(off) || 0); };
  const rowAtEmu = (emu) => { let acc = 0; let r = 1; while (r < 100000 && acc + rowPt(r) * EMU_PER_PT <= emu) { acc += rowPt(r) * EMU_PER_PT; r++; } return r; };
  for (const target of Object.values(sheetRels).filter((t) => /drawings\/[^/]+\.xml$/i.test(t || ''))) {
    const drawingPart = resolvePart(part, target);
    const dxml = await book.read(drawingPart);
    const drels = rels(await book.read(relsPath(drawingPart)));
    for (const kind of ['twoCellAnchor', 'oneCellAnchor', 'absoluteAnchor']) {
      for (const a of blocks(dxml, kind)) {
        const marker = (name) => { const m = inner(a.body, name); return m == null ? null : { col: Number(inner(m, 'col')), row: Number(inner(m, 'row')), rowOff: Number(inner(m, 'rowOff')) || 0 }; };
        const from = marker('from'); const to = marker('to');
        const ext = a.body.match(new RegExp(`<${T('ext')}\\b[^>]*\\bcy="(\\d+)"`));
        const pos = a.body.match(new RegExp(`<${T('pos')}\\b[^>]*\\by="(\\d+)"`));
        let top; let bottom;
        if (from) top = topEmu(from.row, from.rowOff); else if (pos) top = Number(pos[1]); else continue;
        if (to) bottom = topEmu(to.row, to.rowOff); else bottom = top + (ext ? Number(ext[1]) : 0);
        const mid = (top + Math.max(top, bottom)) / 2;
        for (const blip of a.body.matchAll(new RegExp(`<${T('blip')}\\b[^>]*>`, 'g'))) {
          const rid = attr(blip[0], 'embed') || attr(blip[0], 'link');
          if (!rid || !drels[rid]) continue;
          const buffer = await book.readBuf(resolvePart(drawingPart, drels[rid]));
          if (buffer) out.push({ row: rowAtEmu(mid), col: (from ? from.col : 0) + 1, buffer, kind: 'floating' });
        }
      }
    }
  }
  return out;
}

/**
 * Pictures placed IN a cell (Excel 365 "Place in Cell" / IMAGE()). They live in xl/richData; older Excel
 * shows such a cell as #VALUE! — likely what one row in this sheet shows.
 */
async function inCellImages(book, cells) {
  const rvXml = await book.read('xl/richData/rdrichvalue.xml');
  const relXml = await book.read('xl/richData/richValueRel.xml');
  if (!rvXml || !relXml) return [];
  const structs = blocks(await book.read('xl/richData/rdrichvaluestructure.xml'), 's')
    .map((s) => blocks(s.body, 'k').map((k) => attr(`<x${k.attrs}>`, 'n')));
  const rvs = blocks(rvXml, 'rv').map((rv) => {
    const keys = structs[Number(attr(`<x${rv.attrs}>`, 's')) || 0] || [];
    const vals = blocks(rv.body, 'v').map((v) => v.body);
    const at = keys.indexOf('_rvRel:LocalImageIdentifier');
    return Number(vals[at >= 0 ? at : 0]);
  });
  const relIds = blocks(relXml, 'rel').map((r) => attr(`<x${r.attrs}>`, 'id'));
  const relTargets = rels(await book.read('xl/richData/_rels/richValueRel.xml.rels'));
  // vm (1-based) → valueMetadata bk → rc v → futureMetadata XLRICHVALUE bk → rvb i
  const metaXml = (await book.read('xl/metadata.xml')) || '';
  const future = [...metaXml.matchAll(new RegExp(`<${T('rvb')}\\b[^>]*\\bi="(\\d+)"`, 'g'))].map((m) => Number(m[1]));
  const valueMeta = blocks(inner(metaXml, 'valueMetadata'), 'bk').map((b) => Number((b.body.match(/\bv="(\d+)"/) || [])[1]));
  const rvIndex = (vm) => { const v = valueMeta[vm - 1]; return Number.isFinite(v) && future[v] != null ? future[v] : vm - 1; };

  const out = [];
  for (const [r, row] of cells) {
    for (const [c, cell] of row) {
      if (!cell.vm) continue;
      const target = relTargets[relIds[rvs[rvIndex(Number(cell.vm))]]];
      if (!target) continue;
      const buffer = await book.readBuf(resolvePart('xl/richData/richValueRel.xml', target));
      if (buffer) out.push({ row: r, col: c, buffer, kind: 'in-cell' });
    }
  }
  return out;
}

// ──────────────────────────────── read sheet ─────────────────────────────
async function readSheet() {
  const book = await openWorkbook(FILE);
  const sheet = book.sheets.find((s) => s.name === SHEET) || book.sheets.find((s) => s.name.toLowerCase() === SHEET.toLowerCase());
  if (!sheet) throw new Error(`Sheet "${SHEET}" not found. Sheets in this file: ${book.sheets.map((s) => `"${s.name}"`).join(', ')}`);
  const { rows: cells, rowPt } = await readCells(book, sheet.part);
  const get = (r, c) => cells.get(r)?.get(c)?.text ?? '';

  // header row = the row with "PRODUCT NAME…"; columns are found by their header text
  let header = null; const col = {};
  for (const [r, row] of [...cells].sort((a, b) => a[0] - b[0])) {
    for (const [c, cell] of row) if (clean(cell.text).toUpperCase().startsWith('PRODUCT NAME')) { header = r; col.name = c; }
    if (!header) continue;
    for (const [c, cell] of row) {
      const t = clean(cell.text).toUpperCase();
      if (t.startsWith('PACKAG')) col.pack = c;
      else if (t.startsWith('PRICE')) col.price = c;
      else if (t.startsWith('UPC') || t.includes('BARCODE')) col.upc = c;
    }
    break;
  }
  if (!header || !col.name || !col.pack || !col.price) throw new Error(`Could not find the header row (PRODUCT NAME / PACKAGING / PRICE) in "${sheet.name}". Found: ${JSON.stringify(col)}`);

  const images = [...(await floatingImages(book, sheet.part, rowPt)), ...(await inCellImages(book, cells))];
  const imgByRow = new Map();
  for (const im of images) {
    im.ext = sniff(im.buffer);
    const cur = imgByRow.get(im.row);
    if (!cur || im.buffer.length > cur.buffer.length) imgByRow.set(im.row, im);
  }

  const rows = []; const used = new Set();
  const lastRow = Math.max(...cells.keys());
  for (let r = header + 1; r <= lastRow; r++) {
    const name = clean(get(r, col.name));
    if (!name || name.toUpperCase().startsWith('PRODUCT NAME') || name.toUpperCase() === 'PRODUCT PRICING') continue; // blank / repeated header
    const packRaw = clean(get(r, col.pack));
    const priceRaw = clean(get(r, col.price));
    const upc = col.upc ? parseUpc(get(r, col.upc)) : '';
    let outOfStock = false; const errors = [];
    for (const cell of (cells.get(r) || new Map()).values()) {
      if (/out\s*of\s*stock/i.test(cell.text)) outOfStock = true; // note sits outside the table
      if (cell.error || /^#(VALUE|REF|N\/A|NAME|DIV\/0)[!?]?/i.test(clean(cell.text))) errors.push(clean(cell.text));
    }
    const { pack, size } = parsePackaging(packRaw, name);
    const img = imgByRow.get(r) || null;
    if (img) used.add(img);
    rows.push({ row: r, name, packRaw, pack, size, priceRaw, price: parsePrice(priceRaw), upc, outOfStock, errors, img });
  }

  // Photos that didn't land on a product row. Two very different cases:
  //  a) a 2nd (smaller) photo on a row that already has one → skipped
  //  b) the photo's centre sits on a row with no product name (blank spacer row, or the picture hangs
  //     between two products). If exactly one neighbouring product row (±1) has no photo yet, it goes there.
  const byRow = new Map(rows.map((p) => [p.row, p]));
  const orphanImages = [];
  for (const im of images.filter((i) => !used.has(i)).sort((a, b) => a.row - b.row)) {
    const own = byRow.get(im.row);
    if (own) { orphanImages.push({ ...im, reason: 'extra', product: own }); continue; }
    const free = [byRow.get(im.row - 1), byRow.get(im.row + 1)].filter((p) => p && !p.img);
    if (free.length === 1) { free[0].img = im; im.movedTo = free[0]; used.add(im); continue; }
    const near = [...rows].sort((a, b) => Math.abs(a.row - im.row) - Math.abs(b.row - im.row)).slice(0, 2).sort((a, b) => a.row - b.row);
    orphanImages.push({ ...im, reason: free.length ? 'ambiguous' : 'no-product', near });
  }
  const moved = images.filter((i) => i.movedTo);
  return { sheet: sheet.name, header, col, rows, images, orphanImages, moved };
}

// ──────────────────────────────── verify ─────────────────────────────────
function verify({ rows, images, orphanImages, moved }) {
  const warn = [];
  const ids = new Map();
  const noPrice = []; const noPack = [];
  const who = (p) => `${p.row} "${p.name}"`;
  for (const p of rows) {
    p.id = `skn-${slug(`${p.name} ${p.packRaw}`)}`.slice(0, 120);
    if (ids.has(p.id)) warn.push(`Row ${p.row}: same name + packaging as row ${ids.get(p.id)} ("${p.name}") — only the last one will be kept.`);
    ids.set(p.id, p.row);
    if (!p.packRaw) noPack.push(p);
    if (p.price == null) noPrice.push(p);
    if (p.upc && ![8, 12, 13, 14].includes(p.upc.length)) warn.push(`Row ${p.row}: "${p.name}" UPC "${p.upc}" is ${p.upc.length} digits — check it.`);
    if (p.upc === '1234567890128') warn.push(`Row ${p.row}: "${p.name}" UPC 1234567890128 looks like a placeholder.`);
    if (p.errors.length) warn.push(`Row ${p.row}: "${p.name}" has an Excel error in a cell (${p.errors.join(', ')})${p.img ? '' : ' — no photo could be read for it'}.`);
    if (p.img && !EXT_TYPE[p.img.ext]) warn.push(`Row ${p.row}: "${p.name}" photo is ${p.img.ext.toUpperCase()} — browsers can't show it, it will be skipped. Re-save that picture as PNG/JPG in Excel.`);
  }
  if (noPrice.length) warn.push(`${noPrice.length} products have no price ($0 or blank) → saved as price on request ("Inquire now"): rows ${noPrice.map((p) => p.row).join(', ')}.`);
  if (noPack.length) warn.push(`${noPack.length} products have no packaging: ${noPack.map(who).join(', ')}.`);
  for (const im of moved) warn.push(`Photo centred on blank row ${im.row} → given to the product next to it, row ${who(im.movedTo)}. Check images/${String(im.movedTo.row).padStart(3, '0')}-….`);
  for (const im of orphanImages) {
    if (im.reason === 'extra') warn.push(`Row ${who(im.product)} has 2 photos — the bigger one is used, the other is skipped (saved in images/unused/).`);
    else warn.push(`Photo on row ${im.row} has no product on its row${im.reason === 'ambiguous' ? ' and could belong to either neighbour' : ''} — nearest: ${im.near.map(who).join(' / ')}. Not used (saved in images/unused/).`);
  }

  const withImg = rows.filter((p) => p.img && EXT_TYPE[p.img.ext]).length;
  console.log(`\nSheet "${SHEET}" — ${rows.length} products, ${images.length} photos in the sheet, ${withImg} products with a usable photo, ${rows.length - withImg} without.\n`);
  console.table(rows.map((p) => ({
    row: p.row, name: p.name.slice(0, 44), size: p.size || '', pack: p.pack || '', price: p.price ?? 'on request',
    upc: p.upc, oos: p.outOfStock ? 'OUT' : '', photo: p.img ? `${p.img.ext}${p.img.kind === 'in-cell' ? ' (cell)' : ''}${p.img.movedTo ? ' (moved)' : ''}` : '—',
  })));
  if (warn.length) { console.log(`\n${warn.length} things to check:`); warn.forEach((w) => console.log(`  • ${w}`)); }
  return warn;
}

function writeReport(data, warn) {
  const dir = path.resolve(OUT); const imgDir = path.join(dir, 'images');
  fs.rmSync(imgDir, { recursive: true, force: true }); fs.mkdirSync(imgDir, { recursive: true });
  const report = data.rows.map((p) => {
    let photo = null;
    if (p.img) { photo = `images/${String(p.row).padStart(3, '0')}-${slug(p.name).slice(0, 60)}.${p.img.ext}`; fs.writeFileSync(path.join(dir, photo), p.img.buffer); }
    const { img, errors, ...rest } = p;
    return { ...rest, photo };
  });
  if (data.orphanImages.length) {
    fs.mkdirSync(path.join(imgDir, 'unused'), { recursive: true });
    data.orphanImages.forEach((im, i) => fs.writeFileSync(path.join(imgDir, 'unused', `row-${String(im.row).padStart(3, '0')}-${i + 1}.${im.ext}`), im.buffer));
  }
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ file: path.basename(FILE), sheet: SHEET, products: report, warnings: warn }, null, 1));
  console.log(`\nReport: ${path.join(dir, 'report.json')}\nPhotos: ${imgDir}  (open the folder — each file is named by its sheet row so you can check it matches)`);
}

// ─────────────────────────────────── S3 ──────────────────────────────────
async function s3Uploader() {
  const { S3Client, PutObjectCommand, HeadObjectCommand } = await import('@aws-sdk/client-s3');
  const env = (k, d = '') => (process.env[k] || d).trim();
  const c = {
    bucket: env('AWS_BUCKET'), region: env('AWS_DEFAULT_REGION', 'us-east-1'), root: env('AWS_FOLDER', 'jolof').replace(/^\/+|\/+$/g, ''),
    pathStyle: env('AWS_USE_PATH_STYLE_ENDPOINT') === 'true', endpoint: env('AWS_ENDPOINT'), publicBase: env('AWS_URL').replace(/\/+$/, ''),
  };
  if (!c.bucket || !env('AWS_ACCESS_KEY_ID') || !env('AWS_SECRET_ACCESS_KEY')) throw new Error('AWS_BUCKET / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY missing from .env — photos cannot be uploaded.');
  const client = new S3Client({
    region: c.region, forcePathStyle: c.pathStyle, ...(c.endpoint ? { endpoint: c.endpoint } : {}),
    credentials: { accessKeyId: env('AWS_ACCESS_KEY_ID'), secretAccessKey: env('AWS_SECRET_ACCESS_KEY') },
  });
  const publicUrl = (key) => (c.publicBase ? `${c.publicBase}/${key}`
    : c.endpoint ? `${c.endpoint.replace(/\/+$/, '')}/${c.bucket}/${key}`
      : c.pathStyle ? `https://s3.${c.region}.amazonaws.com/${c.bucket}/${key}` : `https://${c.bucket}.s3.${c.region}.amazonaws.com/${key}`);

  // key includes a hash of the photo → same photo is never uploaded twice, a changed photo gets a new URL
  return async (p) => {
    const key = `${c.root}/${S3_SUBFOLDER}/${p.id.replace(/^skn-/, '').slice(0, 80)}-${sha(p.img.buffer).slice(0, 10)}.${p.img.ext}`;
    let exists = false;
    try { await client.send(new HeadObjectCommand({ Bucket: c.bucket, Key: key })); exists = true; } catch { /* not there yet */ }
    if (!exists) {
      await client.send(new PutObjectCommand({
        Bucket: c.bucket, Key: key, Body: p.img.buffer, ContentType: EXT_TYPE[p.img.ext],
        CacheControl: 'public, max-age=31536000, immutable', Metadata: { 'uploaded-by': 'import-skincare' },
      }));
    }
    return { url: publicUrl(key), uploaded: !exists };
  };
}

// ──────────────────────────────── database ───────────────────────────────
const describe = (p) => {
  const parts = [`${p.name}${p.size && !p.name.toLowerCase().includes(p.size.toLowerCase()) ? `, ${p.size}` : ''}. Wholesale ${p.packRaw || 'case'} — sold by the case only.`];
  if (p.price != null) parts.push('Price shown is the JOLOF TRADING wholesale price per case.');
  if (p.upc) parts.push(`UPC ${p.upc}.`);
  return parts.join(' ');
};

/** Finds the Skin Care category however the department is named (Cosmetics / Beauty / …). Creates the category only when the department exists. */
async function findCategory(prisma) {
  const depts = await prisma.department.findMany({ include: { categories: true }, orderBy: { sort: 'asc' } });
  const host = (() => { try { return new URL(process.env.DATABASE_URL).host; } catch { return '(DATABASE_URL not set)'; } })();
  if (!depts.length) throw new Error(`This database has no departments at all (${host}). Most likely .env points at the wrong DB / Neon branch. (npm run db:seed fills an empty DB but WIPES existing data — never run it on production.)`);

  let dept = DEPT_ARG ? depts.find((d) => d.name.toLowerCase() === DEPT_ARG.toLowerCase()) : null;
  if (DEPT_ARG && !dept) throw new Error(`No department "${DEPT_ARG}". Departments in ${host}: ${depts.map((d) => `"${d.name}"`).join(', ')}`);
  if (!dept) {
    const withCat = depts.filter((d) => d.categories.some((c) => c.name.toLowerCase() === CATEGORY.toLowerCase()));
    dept = withCat.find((d) => /cosmetic|beauty|skin/i.test(d.name)) || (withCat.length === 1 ? withCat[0] : null)
      || depts.find((d) => /cosmetic|beauty|skin/i.test(d.name));
  }
  if (!dept) throw new Error(`Couldn't find a Cosmetics / Beauty department or a "${CATEGORY}" category in ${host}. Departments there: ${depts.map((d) => `"${d.name}"`).join(', ')}. Re-run with --department "<one of these>".`);

  let cat = dept.categories.find((c) => c.name.toLowerCase() === CATEGORY.toLowerCase()) || null;
  if (!cat && !DRY) cat = await prisma.category.create({ data: { departmentId: dept.id, name: CATEGORY, status: 'active', sort: await prisma.category.count() } });
  return { dept, cat };
}

async function syncDatabase(rows) {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const { dept, cat } = await findCategory(prisma);
    console.log(`\nDatabase: ${dept.name} › ${cat?.name || CATEGORY} ${cat ? `(${cat.id})` : '(will be created)'}`);

    const existing = new Map((await prisma.product.findMany({ where: { id: { in: rows.map((p) => p.id) } } })).map((p) => [p.id, p]));
    // next free JLF-SKN-### number
    const skus = await prisma.product.findMany({ where: { sku: { startsWith: SKU_PREFIX } }, select: { sku: true } });
    let nextSku = Math.max(0, ...skus.map((s) => Number(s.sku.slice(SKU_PREFIX.length)) || 0)) + 1;
    let sort = ((await prisma.product.aggregate({ _max: { sort: true } }))._max.sort ?? 0) + 1;

    const upload = DRY ? null : await s3Uploader();
    const tally = { created: 0, updated: 0, photosUploaded: 0, photosReused: 0, photoKept: 0, noPhoto: 0, failed: [] };

    for (const p of rows) {
      const ex = existing.get(p.id);
      try {
        let img;
        if (p.img && EXT_TYPE[p.img.ext]) {
          if (DRY) img = '(photo → S3)';
          else { const r = await upload(p); img = r.url; tally[r.uploaded ? 'photosUploaded' : 'photosReused']++; }
        } else if (ex?.img) tally.photoKept++;
        else tally.noPhoto++;

        const data = {
          name: p.name, brand: ex?.brand ?? null, size: p.size, pack: p.pack, price: p.price, desc: describe(p), real: true,
          categoryId: cat?.id, ...(img ? { img } : {}),
          ...(HIDE_OOS ? { status: p.outOfStock ? 'hidden' : 'active' } : {}),
        };
        if (DRY) { console.log(`  ${ex ? 'update' : 'create'}  ${p.id}  ${p.price ?? 'on request'}  ${img ? 'photo' : ex?.img ? 'keeps photo' : 'no photo'}`); ex ? tally.updated++ : tally.created++; continue; }

        if (ex) { await prisma.product.update({ where: { id: p.id }, data }); tally.updated++; }
        else {
          await prisma.product.create({ data: { id: p.id, sku: `${SKU_PREFIX}${String(nextSku++).padStart(3, '0')}`, lowStock: 5, moq: 1, status: 'active', sort: sort++, source: 'catalogue', ...data } });
          tally.created++;
        }
      } catch (e) {
        tally.failed.push({ row: p.row, name: p.name, error: e.message });
        console.error(`  ✗ row ${p.row} "${p.name}": ${e.message}`);
      }
    }
    console.log(`\n${DRY ? 'Dry run — nothing written.' : 'Done.'}`, tally);
    if (tally.failed.length) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

// ────────────────────────────────── main ─────────────────────────────────
(async () => {
  const data = await readSheet();
  const warn = verify(data);
  if (CHECK) { writeReport(data, warn); return; }
  // later rows win when two rows share an id (warned above)
  const rows = [...new Map(data.rows.map((p) => [p.id, p])).values()];
  await syncDatabase(rows);
})().catch((e) => { console.error(`\n✗ ${e.message}`); process.exitCode = 1; });