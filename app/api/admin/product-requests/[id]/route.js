import { route, body, str } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { withState } from '@/lib/server/respond';
import { approveProductRequest, rejectProductRequest } from '@/lib/server/catalogue';

export const POST = route(async (req, ctx) => {
  const admin = await requireAdmin();
  const d = ['GET', 'DELETE'].includes(req.method) ? {} : await body(req);
  const id = ctx?.params ? (await ctx.params).id : undefined;
  if (d.action === 'approve') { const productId = await approveProductRequest(id, d, admin.name); return withState({ productId }); }
  await rejectProductRequest(id, d.note);
  return withState();
});
