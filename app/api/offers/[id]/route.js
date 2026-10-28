import { route } from '@/lib/server/http';
import { requireVendor } from '@/lib/server/auth';
import { removeOffer } from '@/lib/server/catalogue';
import { withState } from '@/lib/server/respond';

export const DELETE = route(async (_req, { params }) => {
  const u = await requireVendor();
  await removeOffer((await params).id, u);
  return withState();
});
