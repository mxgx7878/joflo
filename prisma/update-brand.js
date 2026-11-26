// Renames the business from "JOLOF TRADING" to "JOLOF TRADE CENTER" in data already saved in the
// database (the code and seed already use the new name — this is for existing databases).
//
//   npx tsx prisma/update-brand.js          → shows what would change (nothing written)
//   npx tsx prisma/update-brand.js --apply  → writes the changes
//
// Touches only text that still contains the old name / old email domain:
//   • Admin › Settings (store name + email, invoice notes and footer) — these override the code defaults
//   • user / supplier company names (e.g. "JOLOF TRADING (own stock)")
//   • product and product-request descriptions
// Past orders, invoices and emails already sent are left as they are.
import { PrismaClient } from '@prisma/client';

try { process.loadEnvFile?.('.env'); } catch { /* use shell env */ }
const APPLY = process.argv.includes('--apply');

const swap = (s) => String(s)
  .replace(/JOLOF TRADING/g, 'JOLOF TRADE CENTER')
  .replace(/Jolof Trading/g, 'Jolof Trade Center')
  .replace(/joloftrading\.com/gi, 'joloftradescenter.com');
const has = (s) => typeof s === 'string' && swap(s) !== s;

const prisma = new PrismaClient();
(async () => {
  const changes = [];

  const settings = await prisma.setting.findMany();
  settings.forEach((r) => {
    const txt = JSON.stringify(r.value);
    if (has(txt)) changes.push({ label: `Setting "${r.key}"`, before: txt, after: swap(txt), run: () => prisma.setting.update({ where: { key: r.key }, data: { value: JSON.parse(swap(txt)) } }) });
  });

  const users = await prisma.user.findMany({ where: { company: { contains: 'TRADING', mode: 'insensitive' } }, select: { id: true, company: true } });
  users.filter((u) => has(u.company)).forEach((u) => changes.push({ label: `User ${u.id} company`, before: u.company, after: swap(u.company), run: () => prisma.user.update({ where: { id: u.id }, data: { company: swap(u.company) } }) }));

  const products = await prisma.product.findMany({ where: { desc: { contains: 'TRADING', mode: 'insensitive' } }, select: { id: true, name: true, desc: true } });
  products.filter((p) => has(p.desc)).forEach((p) => changes.push({ label: `Product ${p.id} (${p.name}) description`, before: '…JOLOF TRADING…', after: '…JOLOF TRADE CENTER…', run: () => prisma.product.update({ where: { id: p.id }, data: { desc: swap(p.desc) } }) }));

  const reqs = await prisma.productRequest.findMany({ where: { desc: { contains: 'TRADING', mode: 'insensitive' } }, select: { id: true, desc: true } });
  reqs.filter((p) => has(p.desc)).forEach((p) => changes.push({ label: `Product request ${p.id} description`, before: '…JOLOF TRADING…', after: '…JOLOF TRADE CENTER…', run: () => prisma.productRequest.update({ where: { id: p.id }, data: { desc: swap(p.desc) } }) }));

  if (!changes.length) { console.log('Nothing still says JOLOF TRADING — no changes needed.'); return; }
  changes.forEach((c) => console.log(`${c.label}\n  ${c.before}\n  → ${c.after}`));

  if (!APPLY) { console.log(`\nDry run — ${changes.length} change(s). Run again with --apply to write them.`); return; }
  for (const c of changes) await c.run();
  console.log(`\nDone. ${changes.length} record(s) updated.`);
})()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
