import { route, body, str } from '@/lib/server/http';
import { requireVendor, actorName } from '@/lib/server/auth';
import { rejectFulfilment } from '@/lib/server/orders';
import { withState } from '@/lib/server/respond';

/** Supplier can't fill it → stock returns, lines re-route (JOLOF first, then the next nearest supplier). */
export const POST = route(async (req) => {
  const u = await requireVendor({ active: true });
  const d = await body(req);
  const r = await rejectFulfilment(str(d.orderId, 40), str(d.warehouseId, 40), str(d.reason, 300), u, actorName(u));
  return withState(r);
});
