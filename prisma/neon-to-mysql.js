// npm run db:copy-from-neon — copies every row from the old Neon (PostgreSQL) database
// into the MySQL database in DATABASE_URL.
//
//   NEON_DATABASE_URL = the old Neon connection string (read only, nothing is changed there)
//   DATABASE_URL      = the new MySQL database (must already have the tables: npm run db:migrate)
//
// The MySQL tables are emptied first, then filled in foreign-key order. Safe to re-run.
import pg from 'pg';
import { PrismaClient, Prisma } from '@prisma/client';

const SOURCE = process.env.NEON_DATABASE_URL;
if (!SOURCE) {
  console.error('Set NEON_DATABASE_URL to the old Neon connection string first.');
  process.exit(1);
}
if (!/^mysql:/.test(process.env.DATABASE_URL || '')) {
  console.error('DATABASE_URL must point at the MySQL database (mysql://...).');
  process.exit(1);
}

// Parents before children, so foreign keys always resolve.
const ORDER = [
  'User', 'Address', 'Department', 'Category', 'Product', 'Warehouse', 'SupplierOffer',
  'StockLevel', 'StockLog', 'ProductRequest', 'Commodity', 'Driver', 'Order', 'OrderItem',
  'Fulfilment', 'Inquiry', 'Invoice', 'Setting', 'Subscriber', 'Counter',
];
const BATCH = 500;

// Prisma stores DateTime in Postgres as "timestamp without time zone" holding UTC.
// pg would read those as local time (5 hours off in Karachi) — read them as UTC instead.
pg.types.setTypeParser(1114, (s) => new Date(s.replace(' ', 'T') + 'Z'));

const prisma = new PrismaClient();
const delegate = (model) => prisma[model[0].toLowerCase() + model.slice(1)];

// Json columns per model, from the Prisma schema — a null there must be sent as DbNull.
const jsonFields = Object.fromEntries(
  Prisma.dmmf.datamodel.models.map((m) => [m.name, m.fields.filter((f) => f.type === 'Json').map((f) => f.name)]),
);

function clean(model, row) {
  const out = { ...row };
  for (const f of jsonFields[model] || []) if (out[f] === null) out[f] = Prisma.DbNull;
  return out;
}

async function main() {
  const src = new pg.Client({ connectionString: SOURCE, ssl: /sslmode=require|neon\.tech/.test(SOURCE) ? { rejectUnauthorized: false } : undefined });
  await src.connect();

  console.log('Emptying MySQL tables…');
  for (const model of [...ORDER].reverse()) await delegate(model).deleteMany();

  for (const model of ORDER) {
    const { rows } = await src.query(`SELECT * FROM "${model}"`);
    for (let i = 0; i < rows.length; i += BATCH) {
      await delegate(model).createMany({ data: rows.slice(i, i + BATCH).map((r) => clean(model, r)) });
    }
    const copied = await delegate(model).count();
    const flag = copied === rows.length ? '' : `  ⚠ expected ${rows.length}`;
    console.log(`${model.padEnd(15)} ${String(copied).padStart(6)}${flag}`);
  }

  await src.end();
  console.log('Done — Neon data is now in MySQL.');
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
