import { PrismaClient } from '@prisma/client';

// One Prisma client per server process (re-used across hot reloads in dev).
// Transactions get more time than Prisma's 5 s default: the live database is far from the web
// server, so each query takes a round trip and a multi-item order used to run out of time.
const g = globalThis;
export const prisma = g.__jolofPrisma || new PrismaClient({ transactionOptions: { maxWait: 10000, timeout: 30000 } });
if (process.env.NODE_ENV !== 'production') g.__jolofPrisma = prisma;
