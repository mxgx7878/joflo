import { route, body, str } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { withState } from '@/lib/server/respond';
import { prisma } from '@/lib/server/db';

export const DELETE = route(async (req, ctx) => {
  const admin = await requireAdmin();
  const d = ['GET', 'DELETE'].includes(req.method) ? {} : await body(req);
  const id = ctx?.params ? (await ctx.params).id : undefined;
  const open = await prisma.order.count({ where: { driverId: id, status: { in: ['confirmed', 'packed', 'shipped'] } } });
  if (open) return { ok: false, error: `This driver has ${open} open delivery(ies) — reassign them first, or mark the driver inactive.` };
  await prisma.driver.delete({ where: { id } });
  return withState();
});
