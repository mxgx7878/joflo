// Order-level card payment bookkeeping.
//
// An order can carry several Square payments: the checkout (or quote) charge, plus "balance"
// charges when JOLOF raised the total after the customer paid. Money JOLOF still wants is an
// open PaymentRequest the customer pays through a private link (/pay/<token>).
//
//   paid (net)  = Σ charged − Σ refunded over COMPLETED payments
//   balance due = Σ open balance requests
import { randomBytes } from 'node:crypto';
import { prisma } from './db';
import { fail, round2 } from './http';
import { nextNumber } from './settings';
import { captureCard, refundAcross, voidCard } from './square';

const nowIso = () => new Date().toISOString();
const sum = (xs) => round2(xs.reduce((s, x) => s + (Number(x) || 0), 0));

export const newToken = () => randomBytes(24).toString('base64url');
export const appUrl = () => (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
export const payUrl = (token) => `${appUrl()}/pay/${token}`;

/** Net card money JOLOF holds for an order. */
export const netPaid = (payments) => sum(payments.filter((p) => p.status === 'COMPLETED').map((p) => p.amount - p.refunded));
export const refundedTotal = (payments) => sum(payments.filter((p) => p.status === 'COMPLETED').map((p) => p.refunded));
export const openBalance = (requests) => sum(requests.filter((r) => r.status === 'open' && r.kind === 'balance').map((r) => r.amount));

/** Order.payment for a card order, from all of its payments and requests. */
export function cardPaymentStatus(order, payments, requests) {
  const done = payments.filter((p) => p.status === 'COMPLETED');
  if (!done.length) {
    if (payments.some((p) => p.status === 'APPROVED')) return 'authorized';
    if (payments.some((p) => p.status === 'CANCELED')) return 'voided';
    if (payments.some((p) => p.status === 'FAILED')) return 'failed';
    return 'unpaid';
  }
  const paid = netPaid(payments);
  if (order.status === 'cancelled') return paid <= 0.005 ? 'refunded' : 'partially_refunded';
  if (paid >= round2(order.total) - 0.005) return 'paid';
  if (requests.some((r) => r.status === 'open' && r.kind === 'balance')) return 'partially_paid';
  return refundedTotal(payments) > 0 ? 'partially_refunded' : 'partially_paid';
}

const INVOICE_FROM = { paid: 'paid', partially_refunded: 'paid', refunded: 'paid', partially_paid: 'partially_paid' };

/** Recompute order.payment (+ invoice status) after any card payment / request change. */
export async function refreshOrderPayment(db, orderId) {
  const o = await db.order.findUnique({ where: { id: orderId }, include: { payments: true, requests: true, invoice: true } });
  if (!o || o.paymentMethod !== 'card') return o?.payment;
  const next = cardPaymentStatus(o, o.payments, o.requests);
  if (next !== o.payment) await db.order.update({ where: { id: orderId }, data: { payment: next } });
  if (o.invoice && o.invoice.status !== 'void') {
    const inv = INVOICE_FROM[next] || 'unpaid';
    if (inv !== o.invoice.status) await db.invoice.update({ where: { orderId }, data: { status: inv } });
  }
  return next;
}

/** New PaymentRequest (inside a transaction). */
export async function createRequest(tx, { kind, orderId = null, inquiryId = null, amount, reason = '', name = '', email = '', by = 'System' }) {
  const n = await nextNumber(tx, 'payreq', 1001);
  return tx.paymentRequest.create({ data: { id: `PR-${n}`, kind, orderId, inquiryId, amount: round2(amount), reason, name, email, createdBy: by, token: newToken() } });
}

export async function cancelOpen(tx, where) {
  await tx.paymentRequest.updateMany({ where: { ...where, status: 'open' }, data: { status: 'cancelled', cancelledAt: new Date() } });
}

/**
 * Card order about to be confirmed / re-priced at `total`. Settles the difference with Square
 * BEFORE prices are saved (a Square failure leaves the order untouched):
 *   • an old uncaptured hold is captured (up to the new total)
 *   • paid more than the new total → the difference is refunded to the card
 * Returns { refunded, due, events } — `due` is the extra amount still to ask for (> 0) which
 * the caller turns into a balance PaymentRequest inside its transaction (see applyBalance).
 */
export async function settleCardTotal(order, total, actor) {
  const events = [];
  let payments = await prisma.payment.findMany({ where: { orderId: order.id } });
  const hold = payments.find((p) => p.status === 'APPROVED');
  if (hold) {
    const capture = Math.min(round2(total), round2(hold.amount));
    const charged = await captureCard(hold, capture);
    events.push({ at: nowIso(), by: actor, text: `Card charged · ${charged.amount.toFixed(2)} (earlier hold captured)` });
    payments = await prisma.payment.findMany({ where: { orderId: order.id } });
  }
  if (!payments.some((p) => p.status === 'COMPLETED')) {
    fail(400, `This card order has no card payment on file (${payments.length ? `Square status: ${payments[0].status}` : 'none found'}). Cancel it and ask the customer to order again.`);
  }
  const paid = netPaid(payments);
  let refunded = 0;
  if (paid > round2(total) + 0.005) {
    refunded = await refundAcross(payments, round2(paid - total), 'Order total lowered by JOLOF TRADE CENTER');
    events.push({ at: nowIso(), by: actor, text: `Card refunded · ${refunded.toFixed(2)} (final total lower than paid)` });
  }
  const due = round2(total - (paid - refunded));
  return { refunded, due: due > 0.005 ? due : 0, events };
}

/** Inside the confirm transaction: replace any open balance request with one for `due`. */
export async function applyBalance(tx, order, due, actor) {
  const open = await tx.paymentRequest.findMany({ where: { orderId: order.id, kind: 'balance', status: 'open' } });
  // same amount still owed → keep the link the customer already has
  if (due > 0 && open.length === 1 && Math.abs(open[0].amount - due) < 0.005) return open[0];
  await cancelOpen(tx, { orderId: order.id, kind: 'balance' });
  if (!(due > 0)) return null;
  return createRequest(tx, {
    kind: 'balance', orderId: order.id, amount: due, by: actor, name: order.customer?.name || '', email: order.customer?.email || '',
    reason: `Balance for order ${order.id} — the confirmed total is higher than the amount paid at checkout.`,
  });
}

/** Cancelling a card order: release any hold, refund everything charged, close open requests. */
export async function settleCancellation(orderId, actor) {
  const payments = await prisma.payment.findMany({ where: { orderId } });
  const events = [];
  for (const p of payments.filter((x) => x.status === 'APPROVED')) {
    await voidCard(p);
    events.push({ at: nowIso(), by: actor, text: 'Card hold released — the customer was not charged' });
  }
  const paid = netPaid(payments);
  let refunded = 0;
  if (paid > 0.005) {
    refunded = await refundAcross(payments, paid, 'Order cancelled');
    events.push({ at: nowIso(), by: actor, text: `Card refunded · ${refunded.toFixed(2)} (order cancelled)` });
  }
  return { refunded, events };
}

/** Admin refund of part of an order's card payments. */
export async function refundOrderCard(orderId, amount, reason) {
  const payments = await prisma.payment.findMany({ where: { orderId } });
  const room = netPaid(payments);
  const amt = round2(amount);
  if (!(amt > 0)) fail(400, 'Enter an amount to refund.');
  if (amt > room + 0.005) fail(400, `You can refund up to $${room.toFixed(2)}.`);
  return refundAcross(payments, amt, reason || 'Refund from JOLOF TRADE CENTER');
}

/** Browser-safe payment request. Token only for people allowed to pay / share it. */
export const requestOut = (r, { withToken = true } = {}) => ({
  id: r.id, kind: r.kind, orderId: r.orderId, inquiryId: r.inquiryId, amount: r.amount, reason: r.reason, status: r.status,
  createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null, paidAt: r.paidAt ? new Date(r.paidAt).toISOString() : null,
  ...(withToken && r.status === 'open' ? { token: r.token } : {}),
});
