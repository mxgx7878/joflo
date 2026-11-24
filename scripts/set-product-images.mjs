// Fill in missing product photos in the database (uses DATABASE_URL from .env).
//
//   npm run images:check   → dry run: shows what would change, writes nothing
//   npm run images:set     → saves the photos
//
// Two sources:
//   1. scripts/data/product-image-urls.json — photo URLs found online for products without a photo
//   2. lib/catalogue.js — products whose photo ships with the site in /public/products
// Only the `img` field is touched, and only on products that have no photo yet,
// so photos the admin set by hand are never overwritten (add --force to overwrite).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { BASE_PRODUCTS } from '../lib/catalogue.js';

const apply = process.argv.includes('--apply');
const force = process.argv.includes('--force');
const here = path.dirname(fileURLToPath(import.meta.url));
const urls = JSON.parse(fs.readFileSync(path.join(here, 'data/product-image-urls.json'), 'utf8'));
const prisma = new PrismaClient();
const norm = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// wanted image per catalogue id: shipped photo first, else the URL found online
const wanted = new Map();
for (const p of BASE_PRODUCTS) if (p.img) wanted.set(p.id, { img: p.img, name: p.name, size: p.size, from: 'site photo' });
for (const u of urls) if (!wanted.has(u.id)) wanted.set(u.id, { img: u.img, name: u.name, size: u.size, from: `online (${u.match})` });

async function main() {
  const products = await prisma.product.findMany({ select: { id: true, sku: true, name: true, size: true, img: true } });
  const byId = new Map(products.map((p) => [p.id, p]));
  let changed = 0, kept = 0, missing = 0;
  for (const [id, w] of wanted) {
    const p = byId.get(id) || products.find((x) => norm(x.name) === norm(w.name) && norm(x.size) === norm(w.size));
    if (!p) { missing++; continue; }
    if (p.img === w.img) continue;
    if (p.img && !force) { kept++; continue; }
    console.log(`${apply ? 'SET ' : 'WOULD SET'}  ${p.sku}  ${p.name} ${p.size || ''}  ← ${w.from}`);
    if (apply) await prisma.product.update({ where: { id: p.id }, data: { img: w.img } });
    changed++;
  }
  const noPhoto = await prisma.product.count({ where: { OR: [{ img: null }, { img: '' }] } });
  console.log(`\n${apply ? 'Updated' : 'Would update'} ${changed} product(s).`);
  if (kept) console.log(`${kept} product(s) already have their own photo — left alone (use --force to overwrite).`);
  if (missing) console.log(`${missing} catalogue product(s) are not in this database — skipped.`);
  console.log(`${apply ? 'Products still without a photo' : 'Products without a photo right now'}: ${noPhoto - (apply ? 0 : changed)}`);
  if (!apply && changed) console.log('\nLooks right? Run:  npm run images:set');
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
