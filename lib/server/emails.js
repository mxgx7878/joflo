// HTML email building blocks (table layout + inline styles, so they render in Gmail / Outlook / Apple Mail).
const C = { navy: '#0B2347', gold: '#C99A2E', goldPale: '#F6EDD3', emerald: '#07563C', ivory: '#FAF9F5', sand: '#F2EEE4', ink: '#18232E', muted: '#5f6873', line: '#E7E3D8', red: '#B4432F', redPale: '#F8E7E3', greenPale: '#E3F2EA', bluePale: '#E6EEF8' };
const FONT = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

export const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const usd = (n) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtDay = (d) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const qtyUnit = (qty, unit) => (unit && unit !== 'units' ? `${qty} ${Number(qty) === 1 && /s$/i.test(unit) ? unit.slice(0, -1) : unit}` : `${qty}`);

export const p = (html, style = '') => `<p style="margin:0 0 14px;${FONT}font-size:15px;line-height:1.6;color:${C.ink};${style}">${html}</p>`;
export const h2 = (text) => `<h2 style="margin:26px 0 10px;${FONT}font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:${C.gold};font-weight:800;">${esc(text)}</h2>`;

/** Call-to-action button. */
export const button = (label, url, tone = 'gold') => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 8px;"><tr>
<td style="border-radius:999px;background:${tone === 'navy' ? C.navy : C.gold};">
<a href="${esc(url)}" style="display:inline-block;padding:14px 28px;${FONT}font-size:15px;font-weight:800;color:${tone === 'navy' ? '#ffffff' : C.navy};text-decoration:none;border-radius:999px;">${esc(label)}</a>
</td></tr></table>
<p style="margin:0 0 18px;${FONT}font-size:12px;color:${C.muted};">Or copy this link: <a href="${esc(url)}" style="color:${C.emerald};word-break:break-all;">${esc(url)}</a></p>`;

/** Coloured note box. tone: info | success | warn | danger */
export function box(html, tone = 'info') {
  const bg = { info: C.bluePale, success: C.greenPale, warn: C.goldPale, danger: C.redPale }[tone];
  const fg = { info: C.navy, success: C.emerald, warn: '#6d4f12', danger: C.red }[tone];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;"><tr><td style="background:${bg};border-radius:14px;padding:14px 18px;${FONT}font-size:14px;line-height:1.55;color:${fg};">${html}</td></tr></table>`;
}

/** Item lines: [{ name, size, qty, unit, price }] (price per unit; null = TBC) */
export function items(lines) {
  const rows = lines.map((l) => `
<tr>
<td style="padding:10px 0;border-bottom:1px solid ${C.line};${FONT}font-size:14px;color:${C.ink};">
<b style="color:${C.navy};">${esc(l.name)}</b>${l.size ? `<br><span style="font-size:12px;color:${C.muted};">${esc(l.size)}</span>` : ''}
</td>
<td style="padding:10px 8px;border-bottom:1px solid ${C.line};${FONT}font-size:13px;color:${C.muted};white-space:nowrap;text-align:right;">${esc(qtyUnit(l.qty, l.unit))} × ${l.price == null ? 'TBC' : usd(l.price)}</td>
<td style="padding:10px 0;border-bottom:1px solid ${C.line};${FONT}font-size:14px;font-weight:800;color:${C.navy};white-space:nowrap;text-align:right;">${l.price == null ? '—' : usd(l.price * l.qty)}</td>
</tr>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${C.line};">${rows}</table>`;
}

/** Totals block: [[label, value, strong?]] */
export function totals(rows) {
  const tr = rows.filter(Boolean).map(([k, v, strong]) => `
<tr>
<td style="padding:5px 0;${FONT}font-size:${strong ? 16 : 14}px;color:${strong ? C.navy : C.muted};font-weight:${strong ? 800 : 400};${strong ? `border-top:1px solid ${C.line};padding-top:10px;` : ''}">${esc(k)}</td>
<td style="padding:5px 0;${FONT}font-size:${strong ? 16 : 14}px;color:${C.navy};font-weight:${strong ? 800 : 700};text-align:right;${strong ? `border-top:1px solid ${C.line};padding-top:10px;` : ''}">${esc(v)}</td>
</tr>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">${tr}</table>`;
}

/** Label / value list: [[label, valueHtml]] */
export function details(rows) {
  const tr = rows.filter((r) => r && r[1]).map(([k, v]) => `
<tr><td style="padding:4px 14px 4px 0;${FONT}font-size:13px;color:${C.muted};vertical-align:top;white-space:nowrap;">${esc(k)}</td>
<td style="padding:4px 0;${FONT}font-size:14px;color:${C.ink};">${v}</td></tr>`).join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0">${tr}</table>`;
}

export const addressHtml = (a) => (a ? [a.label && `<b>${esc(a.label)}</b>`, esc(a.line1), esc([a.city, a.state, a.postcode].filter(Boolean).join(' '))].filter(Boolean).join('<br>') : '');

/** Full email document. */
export function layout({ title, preheader = '', body, store = {}, appUrl = '' }) {
  const contact = [store.phone && esc(store.phone), store.email && `<a href="mailto:${esc(store.email)}" style="color:${C.emerald};">${esc(store.email)}</a>`].filter(Boolean).join(' · ');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.sand};">
<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.sand};"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td style="background:${C.navy};border-radius:20px 20px 0 0;padding:22px 28px;">
${appUrl ? `<a href="${esc(appUrl)}" style="text-decoration:none;">` : ''}<span style="${FONT}font-size:20px;font-weight:800;letter-spacing:.08em;color:#ffffff;">JOLOF <span style="color:${C.gold};">TRADING</span></span>${appUrl ? '</a>' : ''}
</td></tr>
<tr><td style="background:#ffffff;padding:30px 28px 26px;">
<h1 style="margin:0 0 16px;${FONT}font-size:24px;line-height:1.25;color:${C.navy};font-weight:800;">${esc(title)}</h1>
${body}
</td></tr>
<tr><td style="background:${C.ivory};border-radius:0 0 20px 20px;padding:18px 28px;${FONT}font-size:12px;line-height:1.6;color:${C.muted};">
<b style="color:${C.navy};">${esc(store.name || 'JOLOF TRADING')}</b>${store.address ? ` · ${esc(store.address)}` : ''}<br>${contact}
</td></tr>
</table></td></tr></table></body></html>`;
}

/** Plain-text fallback from the HTML. */
export function toText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<span style="display:none[\s\S]*?<\/span>/i, '')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => { const t = label.replace(/<[^>]+>/g, '').trim(); return t && t !== href ? `${t} (${href})` : href; })
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|tr|h1|h2|table)>/gi, '\n').replace(/<\/td>/gi, '  ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
