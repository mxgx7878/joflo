import { route, body } from '@/lib/server/http';
import { getUser } from '@/lib/server/auth';
import { submitInquiry } from '@/lib/server/inquiries';
import { withState } from '@/lib/server/respond';

export const POST = route(async (req) => {
  const id = await submitInquiry(await body(req), await getUser());
  return withState({ id });
});
