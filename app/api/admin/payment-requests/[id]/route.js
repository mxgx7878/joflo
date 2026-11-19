import { route, body, fail } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';
import { withState } from '@/lib/server/respond';
import { refreshOrderPayment } from '@/lib/server/payments';
import { notify } from '@/lib/server/notify';

/**
 * Admin actions on a payment request (quote or balance link).
 *   { action: 'resend' } → email the private payment link again
 *   { action: 'cancel' } → withdraw the link (e.g. waive a balance so the order can ship)
 */
export const POST = route(async (req, { params }) => {
  const admin = await requireAdmin();
  const { action } = await body(req);
  const r = await prisma.paymentRequest.findUnique({ where: { id: (await params).id } });
  if (!r) fail(404, 'Payment request not found.');
  if (r.status !== 'open') fail(400, `This request is already ${r.status}.`);
  if (action === 'resend') {
    if (r.kind === 'quote') notify.quoteSent(r.inquiryId, r.id);
    else notify.paymentRequest(r.id);
  } else if (action === 'cancel') {
    await prisma.$transaction(async (tx) => {
      await tx.paymentRequest.update({ where: { id: r.id }, data: { status: 'cancelled', cancelledAt: new Date() } });
      if (r.orderId) {
        const o = await tx.order.findUnique({ where: { id: r.orderId } });
        await tx.order.update({ where: { id: r.orderId }, data: { events: [...o.events, { at: new Date().toISOString(), by: admin.name, text: `Payment request ${r.id} (${'$' + r.amount.toFixed(2)}) cancelled` }] } });
        await refreshOrderPayment(tx, r.orderId);
      }
    });
  } else fail(400, 'Unknown action.');
  return withState();
});
