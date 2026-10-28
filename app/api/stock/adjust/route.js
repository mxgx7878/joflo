import { route, body } from '@/lib/server/http';
import { requireVendor, actorName } from '@/lib/server/auth';
import { adjustStock } from '@/lib/server/catalogue';
import { withState } from '@/lib/server/respond';

export const POST = route(async (req) => {
  const u = await requireVendor();
  await adjustStock(await body(req), u, actorName(u));
  return withState();
});
