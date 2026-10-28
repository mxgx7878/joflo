import { route, body, str } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { withState } from '@/lib/server/respond';
import { prisma } from '@/lib/server/db';

export const POST = route(async (req, ctx) => {
  const admin = await requireAdmin();
  const d = ['GET', 'DELETE'].includes(req.method) ? {} : await body(req);
  const id = ctx?.params ? (await ctx.params).id : undefined;
  const data = { name: str(d.name, 120), phone: str(d.phone, 40), email: str(d.email, 160), vehicle: str(d.vehicle, 80), plate: str(d.plate, 20), homeBase: str(d.homeBase, 40) || null, status: ['active', 'off_duty', 'inactive'].includes(d.status) ? d.status : 'active', notes: str(d.notes, 500) };
  if (data.name.length < 2) return { ok: false, error: 'Driver name is required.' };
  const did = d.id ? (await prisma.driver.update({ where: { id: d.id }, data })).id : (await prisma.driver.create({ data })).id;
  return withState({ id: did });
});
