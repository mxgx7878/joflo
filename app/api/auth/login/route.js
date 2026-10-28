import { route, body, fail, str } from '@/lib/server/http';
import { prisma } from '@/lib/server/db';
import { checkPassword, startSession } from '@/lib/server/auth';
import { buildState } from '@/lib/server/state';

export const POST = route(async (req) => {
  const { email, password } = await body(req);
  const u = await prisma.user.findUnique({ where: { email: str(email, 160).toLowerCase() }, include: { addresses: true } });
  if (!u || !(await checkPassword(String(password || ''), u.passwordHash))) fail(401, 'Email or password is incorrect.');
  if (u.status === 'suspended') fail(403, 'This account has been suspended. Please contact JOLOF TRADING.');
  await startSession(u.id);
  // the new cookie isn't readable in this request yet, so build state for the user directly
  return { user: { id: u.id, role: u.role, status: u.status }, state: await buildState(u) };
});
