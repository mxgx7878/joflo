import { route, body, fail, str, EMAIL } from '@/lib/server/http';
import { prisma } from '@/lib/server/db';

export const POST = route(async (req) => {
  const email = str((await body(req)).email, 160).toLowerCase();
  if (!EMAIL.test(email)) fail(400, 'Enter a valid email.');
  await prisma.subscriber.upsert({ where: { email }, create: { email }, update: {} });
  return {};
});
