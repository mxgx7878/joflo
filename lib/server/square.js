// Square card payments (server only).
//
// JOLOF is the merchant: every card payment goes into JOLOF's own Square account.
// Card payments are CHARGED straight away (checkout, quote links, balance links). When JOLOF
// confirms an order at a different total, the difference is refunded, or asked for as a separate
// PaymentRequest (see payments.js). Older orders may still carry an uncaptured hold (APPROVED),
// which captureCard / voidCard handle.
//
// Env: SQUARE_ENVIRONMENT (sandbox | production), SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID
import { randomUUID } from 'node:crypto';
import { SquareClient, SquareEnvironment, SquareError } from 'square';
import { prisma } from './db';
import { fail, round2 } from './http';

const env = () => (process.env.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox');
export const squareEnabled = () => !!(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);

let _client = null;
function client() {
  if (!squareEnabled()) fail(503, 'Card payments are not set up yet.');
  if (!_client) {
    _client = new SquareClient({
      token: process.env.SQUARE_ACCESS_TOKEN,
      environment: env() === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    });
  }
  return _client;
}

const cents = (dollars) => BigInt(Math.round(round2(dollars) * 100));
const dollars = (money) => (money?.amount != null ? Number(money.amount) / 100 : 0);
const USD = (n) => ({ amount: cents(n), currency: 'USD' });

/** Square error → message a shopper / admin can act on. */
function friendly(e, fallback) {
  if (!(e instanceof SquareError)) {
    console.error('[square]', e);
    return fallback;
  }
  const codes = (e.errors || []).map((x) => x.code);
  console.error('[square]', e.statusCode, JSON.stringify(e.errors || e.body));
  if (codes.includes('GENERIC_DECLINE') || codes.includes('CARD_DECLINED')) return 'Your card was declined. Please try another card.';
  if (codes.includes('INSUFFICIENT_FUNDS')) return 'Your card was declined for insufficient funds. Please try another card.';
  if (codes.includes('CVV_FAILURE')) return 'The security code (CVV) is incorrect.';
  if (codes.includes('ADDRESS_VERIFICATION_FAILURE') || codes.includes('INVALID_POSTAL_CODE')) return 'The ZIP code does not match your card.';
  if (codes.includes('INVALID_EXPIRATION') || codes.includes('CARD_EXPIRED')) return 'Your card has expired or the expiry date is wrong.';
  if (codes.includes('INVALID_CARD') || codes.includes('INVALID_CARD_DATA') || codes.includes('CARD_NOT_SUPPORTED')) return 'This card can\'t be used. Please try another card.';
  if (codes.includes('CARD_DECLINED_VERIFICATION_REQUIRED')) return 'Your bank needs to verify this payment. Please try again.';
  if (codes.includes('UNAUTHORIZED') || e.statusCode === 401) return 'Card payments are not configured correctly (Square access token). Please contact JOLOF.';
  return e.errors?.[0]?.detail || fallback;
}

/** Fields we keep from a Square Payment object. */
function snapshot(p) {
  const card = p.cardDetails?.card || {};
  return {
    status: p.status || 'PENDING',
    amount: dollars(p.amountMoney),
    refunded: dollars(p.refundedMoney),
    currency: p.amountMoney?.currency || 'USD',
    cardBrand: card.cardBrand || '',
    last4: card.last4 || '',
    receiptUrl: p.receiptUrl || '',
    delayedUntil: p.delayedUntil ? new Date(p.delayedUntil) : null,
    raw: JSON.parse(JSON.stringify(p, (_k, v) => (typeof v === 'bigint' ? Number(v) : v))),
  };
}

/** Latest Square payment for an order (or null). */
export const currentPayment = (db, orderId) => db.payment.findFirst({ where: { orderId, provider: 'square' }, orderBy: { createdAt: 'desc' } });

/**
 * Charge `amount` to the shopper's card now. sourceId = token from the Web Payments SDK.
 * kind: checkout | quote | balance · requestId: the PaymentRequest being paid (quote / balance).
 */
export async function chargeCard({ orderId, amount, sourceId, verificationToken, email, note, kind = 'checkout', requestId = null }) {
  if (!(round2(amount) > 0)) fail(400, 'Nothing to pay.');
  let res;
  try {
    res = await client().payments.create({
      sourceId,
      idempotencyKey: `${requestId || orderId}-${kind}-${randomUUID().slice(0, 12)}`,
      amountMoney: USD(amount),
      autocomplete: true,
      locationId: process.env.SQUARE_LOCATION_ID,
      referenceId: requestId || orderId,
      note: (note || `JOLOF TRADING order ${orderId}`).slice(0, 500),
      ...(email ? { buyerEmailAddress: email } : {}),
      ...(verificationToken ? { verificationToken } : {}),
    });
  } catch (e) {
    fail(402, friendly(e, 'We could not take your card payment. Please try again.'));
  }
  const p = res.payment;
  if (!p || !['COMPLETED', 'APPROVED'].includes(p.status)) fail(402, 'Your card was not approved. Please try another card.');
  return prisma.payment.create({ data: { orderId, kind, requestId, provider: 'square', providerId: p.id, ...snapshot(p) } });
}

/** Re-read a payment from Square and store its latest state. */
export async function syncPayment(providerId) {
  let res;
  try {
    res = await client().payments.get({ paymentId: providerId });
  } catch (e) {
    fail(502, friendly(e, 'Could not reach Square to refresh this payment.'));
  }
  return prisma.payment.update({ where: { providerId }, data: snapshot(res.payment) });
}

/**
 * Charge a held payment. If the confirmed total is lower than the hold, the payment is
 * reduced first. A total higher than the hold can't be captured on the same payment.
 */
export async function captureCard(payment, total) {
  if (payment.status === 'COMPLETED') return payment;
  if (payment.status !== 'APPROVED') fail(400, `The card hold is no longer active (Square status: ${payment.status}). Cancel this order and ask the customer to order again.`);
  if (payment.delayedUntil && new Date(payment.delayedUntil) < new Date()) fail(400, 'The 7-day card hold has expired. Cancel this order and ask the customer to order again.');
  if (round2(total) > round2(payment.amount)) fail(400, `The new total (${money(total)}) is more than the amount held on the customer's card (${money(payment.amount)}). Lower the total to ${money(payment.amount)} or less, or cancel and ask the customer to re-order.`);
  try {
    if (round2(total) < round2(payment.amount)) {
      await client().payments.update({ paymentId: payment.providerId, idempotencyKey: randomUUID(), payment: { amountMoney: USD(total) } });
    }
    const res = await client().payments.complete({ paymentId: payment.providerId });
    return prisma.payment.update({ where: { id: payment.id }, data: snapshot(res.payment) });
  } catch (e) {
    fail(502, friendly(e, 'Square could not charge the card. Please try again.'));
  }
}

/** Release a hold (nothing was charged). */
export async function voidCard(payment) {
  if (payment.status !== 'APPROVED') return payment;
  try {
    const res = await client().payments.cancel({ paymentId: payment.providerId });
    return prisma.payment.update({ where: { id: payment.id }, data: snapshot(res.payment) });
  } catch (e) {
    fail(502, friendly(e, 'Square could not release the card hold. Please try again.'));
  }
}

/** Refund part or all of a charged payment back to the card. */
export async function refundCard(payment, amount, reason = '') {
  if (payment.status !== 'COMPLETED') fail(400, 'Only charged card payments can be refunded.');
  const left = round2(payment.amount - payment.refunded);
  const amt = round2(amount);
  if (!(amt > 0)) fail(400, 'Enter an amount to refund.');
  if (amt > left) fail(400, `You can refund up to ${money(left)}.`);
  try {
    await client().refunds.refundPayment({ idempotencyKey: randomUUID(), paymentId: payment.providerId, amountMoney: USD(amt), reason: String(reason || 'Refund from JOLOF TRADING').slice(0, 192) });
  } catch (e) {
    fail(502, friendly(e, 'Square could not process the refund. Please try again.'));
  }
  // refunds can stay PENDING for a moment; record what we asked for, webhooks / sync correct it later
  return prisma.payment.update({ where: { id: payment.id }, data: { refunded: round2(payment.refunded + amt) } });
}

/**
 * Refund `amount` back to the customer, newest charge first, across as many card payments as
 * needed (an order can have a checkout charge plus balance charges). Returns the amount refunded.
 */
export async function refundAcross(payments, amount, reason = '') {
  let left = round2(amount);
  const charged = payments.filter((p) => p.status === 'COMPLETED').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  for (const p of charged) {
    if (left <= 0.005) break;
    const room = round2(p.amount - p.refunded);
    if (room <= 0.005) continue;
    const amt = Math.min(room, left);
    await refundCard(p, amt, reason);
    left = round2(left - amt);
  }
  return round2(amount - left);
}

/** Order.payment value implied by its Square payment. */
export function orderPaymentFrom(p) {
  if (!p) return 'unpaid';
  if (p.status === 'APPROVED') return 'authorized';
  if (p.status === 'COMPLETED') {
    if (p.refunded >= p.amount - 0.005 && p.amount > 0) return 'refunded';
    return p.refunded > 0 ? 'partially_refunded' : 'paid';
  }
  if (p.status === 'CANCELED') return 'voided';
  if (p.status === 'FAILED') return 'failed';
  return 'unpaid';
}

/** Public config for the browser card form. */
export const squarePublicConfig = () => ({
  enabled: squareEnabled() && !!process.env.NEXT_PUBLIC_SQUARE_APP_ID,
  environment: env(),
});

function money(n) {
  return '$' + Number(n || 0).toFixed(2);
}
