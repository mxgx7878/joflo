import { route, body, str } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { withState } from '@/lib/server/respond';
import { reassignGroup } from '@/lib/server/orders';

export const POST = route(async (req, ctx) => {
  const admin = await requireAdmin();
  const d = ['GET', 'DELETE'].includes(req.method) ? {} : await body(req);
  const id = ctx?.params ? (await ctx.params).id : undefined;
  await reassignGroup(id, str(d.from, 40), str(d.to, 40), admin.name);
  return withState();
});
