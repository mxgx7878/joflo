import { route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { cancelByCustomer } from '@/lib/server/orders';
import { withState } from '@/lib/server/respond';

export const POST = route(async (_req, { params }) => {
  const u = await requireUser('customer');
  await cancelByCustomer((await params).id, u);
  return withState();
});
