import { route, body } from '@/lib/server/http';
import { requireVendor, actorName } from '@/lib/server/auth';
import { saveOffer } from '@/lib/server/catalogue';
import { withState } from '@/lib/server/respond';

/** Supplier lists a master product: supply price + stock per warehouse (admin may pass vendorId). */
export const POST = route(async (req) => {
  const u = await requireVendor();
  const d = await body(req);
  await saveOffer(d, u, actorName(u), d.vendorId);
  return withState();
});
