import { route, body } from '@/lib/server/http';
import { getUser } from '@/lib/server/auth';
import { payPage, payByLink } from '@/lib/server/paylinks';

/** Private payment link (/pay/<token>): GET what it's for, POST to pay it. No sign-in needed. */
export const GET = route(async (_req, { params }) => ({ page: await payPage((await params).token) }));

export const POST = route(async (req, { params }) => {
  const { token } = await params;
  const { orderId } = await payByLink(token, await body(req), await getUser());
  return { orderId, page: await payPage(token) };
});
