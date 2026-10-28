import { route, body } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { acceptQuote } from '@/lib/server/inquiries';
import { withState } from '@/lib/server/respond';

export const POST = route(async (req, { params }) => {
  const u = await requireUser('customer');
  if (u.status === 'pending') return { ok: false, error: 'Your trade account is awaiting approval.' };
  const id = await acceptQuote((await params).id, u, await body(req));
  return withState({ id });
});
