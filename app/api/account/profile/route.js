import { route, body, fail, str } from '@/lib/server/http';
import { prisma } from '@/lib/server/db';
import { requireUser, checkPassword, hashPassword } from '@/lib/server/auth';
import { withState } from '@/lib/server/respond';

export const PATCH = route(async (req) => {
  const u = await requireUser();
  const d = await body(req);
  const data = {};
  ['name', 'phone', 'company', 'abn', 'businessType'].forEach((k) => { if (d[k] !== undefined) data[k] = str(d[k], 160); });
  if (data.name !== undefined && data.name.length < 2) fail(400, 'Please enter your name.');
  if (d.newPassword) {
    if (!(await checkPassword(String(d.currentPassword || ''), u.passwordHash))) fail(400, 'Your current password is incorrect.');
    if (String(d.newPassword).length < 6) fail(400, 'Password must be at least 6 characters.');
    data.passwordHash = await hashPassword(String(d.newPassword));
  }
  await prisma.user.update({ where: { id: u.id }, data });
  return withState();
});
