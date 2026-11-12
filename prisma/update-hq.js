// Moves JOLOF's headquarters / main warehouse from Newark NJ to the Bronx on an existing database
// (the seed already has the new address — this is for databases seeded before the change).
//
//   npx tsx prisma/update-hq.js          → shows what would change (nothing written)
//   npx tsx prisma/update-hq.js --apply  → writes the changes
//
// Touches only: the JOLOF in-house warehouse still at 40 Doremus Ave / Newark, and the store
// address on invoices if it is still the old Newark one. Anything edited by hand is left alone.
import { PrismaClient } from '@prisma/client';

try { process.loadEnvFile?.('.env'); } catch { /* use shell env */ }
const APPLY = process.argv.includes('--apply');

const HQ = { name: 'JOLOF HQ — Bronx Main Warehouse', line1: '1186 Randall Ave', city: 'Bronx', state: 'NY', postcode: '10474', locationId: 'bronx', lat: 40.8152, lng: -73.8868 };
const HQ_ADDRESS = '1186 Randall Ave, Bronx, NY 10474';

const prisma = new PrismaClient();
(async () => {
  const house = await prisma.user.findMany({ where: { isHouse: true }, select: { id: true } });
  const whs = await prisma.warehouse.findMany({ where: { vendorId: { in: house.map((h) => h.id) } } });
  const old = whs.filter((w) => /doremus/i.test(w.line1) || (w.city.toLowerCase() === 'newark' && w.state.toUpperCase() === 'NJ'));

  if (!old.length) console.log('Warehouse: no JOLOF warehouse at the old Newark address — nothing to change.');
  old.forEach((w) => console.log(`Warehouse ${w.id}: "${w.name}", ${w.line1}, ${w.city} ${w.state} ${w.postcode}  →  "${HQ.name}", ${HQ_ADDRESS}`));
  if (old.length > 1) console.log('  (more than one match — only the first is moved; check the others in Admin › Vendors)');

  const store = await prisma.setting.findUnique({ where: { key: 'store' } });
  const storeOld = store?.value && typeof store.value === 'object' && /newark|doremus/i.test(String(store.value.address || ''));
  if (storeOld) console.log(`Store address: "${store.value.address}"  →  "${HQ_ADDRESS}"`);
  else console.log(store ? `Store address: "${store.value?.address}" — not the old Newark one, left as is.` : 'Store address: using the default (already the Bronx).');

  if (!APPLY) { console.log('\nDry run — run again with --apply to write these changes.'); return; }
  if (old[0]) await prisma.warehouse.update({ where: { id: old[0].id }, data: HQ });
  if (storeOld) await prisma.setting.update({ where: { key: 'store' }, data: { value: { ...store.value, address: HQ_ADDRESS } } });
  console.log(`\nDone. ${old[0] ? 1 : 0} warehouse and ${storeOld ? 1 : 0} store address updated.`);
})()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
