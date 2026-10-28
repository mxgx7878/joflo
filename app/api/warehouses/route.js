import { route, body } from '@/lib/server/http';
import { requireVendor } from '@/lib/server/auth';
import { saveWarehouse } from '@/lib/server/catalogue';
import { withState } from '@/lib/server/respond';

export const POST = route(async (req) => {
  const u = await requireVendor();
  const id = await saveWarehouse(await body(req), u);
  return withState({ id });
});
