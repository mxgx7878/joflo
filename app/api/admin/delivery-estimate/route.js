import { route, body, str } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { withState } from '@/lib/server/respond';
import { previewDelivery } from '@/lib/server/orders';

export const POST = route(async (req, ctx) => {
  const admin = await requireAdmin();
  const d = ['GET', 'DELETE'].includes(req.method) ? {} : await body(req);
  const id = ctx?.params ? (await ctx.params).id : undefined;
  const lines = (d.lines || []).map((l) => ({ productId: l.productId || null, qty: Math.max(1, parseInt(l.qty, 10) || 1), price: Number(l.unitPrice) || 0 }));
  void withState;
  return { estimate: await previewDelivery({ lines, address: d.address }) };
});
