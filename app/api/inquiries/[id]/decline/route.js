import { route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { declineQuote } from '@/lib/server/inquiries';
import { withState } from '@/lib/server/respond';

export const POST = route(async (_req, { params }) => {
  const u = await requireUser('customer');
  await declineQuote((await params).id, u);
  return withState();
});
