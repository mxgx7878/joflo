import { route, body, str, fail } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { withState } from '@/lib/server/respond';
import { refundOrder, syncAllOrderPayments } from '@/lib/server/orders';

/**
 * Admin actions on an order's Square card payment.
 *   { action: 'refund', amount, reason } → refund part or all of the card payments (newest first)
 *   { action: 'sync' }                   → re-read every card payment on the order from Square
 */
export const POST = route(async (req, ctx) => {
  const admin = await requireAdmin();
  const d = await body(req);
  const id = (await ctx.params).id;
  if (d.action === 'refund') {
    await refundOrder(id, Number(d.amount), str(d.reason, 190), admin.name);
  } else if (d.action === 'sync') {
    await syncAllOrderPayments(id, admin.name);
  } else {
    fail(400, 'Unknown payment action.');
  }
  return withState();
});
