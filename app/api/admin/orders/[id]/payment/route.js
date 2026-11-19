import { route, body, str, fail } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { withState } from '@/lib/server/respond';
import { prisma } from '@/lib/server/db';
import { refundOrder, syncOrderPayment } from '@/lib/server/orders';
import { currentPayment } from '@/lib/server/square';

/**
 * Admin actions on an order's Square card payment.
 *   { action: 'refund', amount, reason } → refund part or all of the charge to the card
 *   { action: 'sync' }                   → re-read the payment from Square
 */
export const POST = route(async (req, ctx) => {
  const admin = await requireAdmin();
  const d = await body(req);
  const id = (await ctx.params).id;
  if (d.action === 'refund') {
    await refundOrder(id, Number(d.amount), str(d.reason, 190), admin.name);
  } else if (d.action === 'sync') {
    const pay = await currentPayment(prisma, id);
    if (!pay) fail(404, 'No card payment found for this order.');
    await syncOrderPayment(pay.providerId, admin.name);
  } else {
    fail(400, 'Unknown payment action.');
  }
  return withState();
});
