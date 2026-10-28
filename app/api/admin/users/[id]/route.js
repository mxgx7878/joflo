import { route, body, str } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { withState } from '@/lib/server/respond';
import { prisma } from '@/lib/server/db';

export const PATCH = route(async (req, ctx) => {
  const admin = await requireAdmin();
  const d = ['GET', 'DELETE'].includes(req.method) ? {} : await body(req);
  const id = ctx?.params ? (await ctx.params).id : undefined;
  if (!['active', 'pending', 'suspended'].includes(d.status)) return { ok: false, error: 'Unknown status.' };
  if (id === admin.id) return { ok: false, error: 'You cannot change your own status.' };
  await prisma.user.update({ where: { id }, data: { status: d.status } });
  return withState();
});
