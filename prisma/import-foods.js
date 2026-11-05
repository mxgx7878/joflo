// npm run db:import-foods — adds / updates the JOLOF FOODS price list WITHOUT wiping anything.
import { PrismaClient } from '@prisma/client';
import { importFoods } from './foods.js';

const prisma = new PrismaClient();
importFoods(prisma)
  .then((r) => { console.log('JOLOF FOODS:', r); })
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
