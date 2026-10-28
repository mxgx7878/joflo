// npm run db:seed — wipes the database and loads the catalogue + demo data.
import { PrismaClient } from '@prisma/client';
import { seedDatabase } from './seed-data.js';

const prisma = new PrismaClient();
seedDatabase(prisma)
  .then((r) => { console.log('Seeded:', r); })
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
