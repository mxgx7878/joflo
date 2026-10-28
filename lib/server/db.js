import { PrismaClient } from '@prisma/client';

// One Prisma client per server process (re-used across hot reloads in dev).
const g = globalThis;
export const prisma = g.__jolofPrisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') g.__jolofPrisma = prisma;
