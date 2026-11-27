import { route, body, str, fail } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { withState } from '@/lib/server/respond';
import { refundOrder, syncAllOrderPayments, recordCashPayment, voidCashPayment } from '@/lib/server/orders';

/**
 * Admin actions on an order's payments.
 * Card (Square):
 *   { action: 'refund', amount, reason } → refund part or all of the card payments (newest first)
 *   { action: 'sync' }                   → re-read every card payment on the order from Square
 * Cash / check on delivery (recorded by hand):
 *   { action: 'record', method: 'cash'|'check', full?, amount?, checkNumber?, receivedAt?, note? }
 *       → money received; full = "Paid in full" (amount = whatever is still owed)
 *   { action: 'void', paymentId, reason? } → cancel a wrongly recorded payment (kept in the history)
 */
export const POST = route(async (req, ctx) => {
  const admin = await requireAdmin();
  const d = await body(req);
  const id = (await ctx.params).id;
  if (d.action === 'refund') {
    await refundOrder(id, Number(d.amount), str(d.reason, 190), admin.name);
  } else if (d.action === 'sync') {
    await syncAllOrderPayments(id, admin.name);
  } else if (d.action === 'record') {
    await recordCashPayment(id, {
      method: str(d.method, 10), full: d.full === true, amount: d.amount === '' || d.amount == null ? undefined : Number(d.amount),
      checkNumber: str(d.checkNumber, 40), receivedAt: str(d.receivedAt, 10), note: str(d.note, 200),
    }, admin.name);
  } else if (d.action === 'void') {
    await voidCashPayment(id, str(d.paymentId, 40), str(d.reason, 200), admin.name);
  } else {
    fail(400, 'Unknown payment action.');
  }
  return withState();
});
