import { route, body, str } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { withState } from '@/lib/server/respond';
import { setOrderStatus, patchOrder, deleteOrder } from '@/lib/server/orders';

export const PATCH = route(async (req, ctx) => {
  const admin = await requireAdmin();
  const d = ['GET', 'DELETE'].includes(req.method) ? {} : await body(req);
  const id = ctx?.params ? (await ctx.params).id : undefined;
  if (d.status) await setOrderStatus(id, str(d.status, 20), str(d.note, 300), admin.name);
  await patchOrder(id, d, admin.name);
  return withState();
});

/** Admin permanently deletes an order (blocked while card money is held / charged or cash payments are recorded). */
export const DELETE = route(async (req, ctx) => {
  const admin = await requireAdmin();
  const id = (await ctx.params).id;
  return withState(await deleteOrder(id, admin.name));
});
