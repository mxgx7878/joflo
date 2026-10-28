import { route, body, str } from '@/lib/server/http';
import { requireVendor, actorName } from '@/lib/server/auth';
import { setFulfilment } from '@/lib/server/orders';
import { withState } from '@/lib/server/respond';

/** Supplier moves their shipment: accepted → packed → shipped → delivered. */
export const POST = route(async (req) => {
  const u = await requireVendor({ active: true });
  const d = await body(req);
  await setFulfilment(str(d.orderId, 40), str(d.warehouseId, 40), str(d.status, 20), d.tracking === undefined ? undefined : str(d.tracking, 120), u, actorName(u));
  return withState();
});
