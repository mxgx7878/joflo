// Square card payments (server only).
//
// JOLOF is the merchant: every card payment goes into JOLOF's own Square account.
// Card orders are AUTHORIZED (a hold on the card) at checkout and CAPTURED when the admin
// confirms the order, because the admin can still change prices / delivery while it's pending.
// Square keeps an online-card hold for 7 days, then cancels it automatically.
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
 * Hold `amount` on the shopper's card for an order (no money moves yet).
 * sourceId = token from the Web Payments SDK.
 */
export async function authorizeCard({ orderId, amount, sourceId, verificationToken, email, note }) {
  let res;
  try {
    res = await client().payments.create({
      sourceId,
      idempotencyKey: `${orderId}-auth-${randomUUID().slice(0, 8)}`,
      amountMoney: USD(amount),
      autocomplete: false, // hold now, capture when JOLOF confirms the order
      locationId: process.env.SQUARE_LOCATION_ID,
      referenceId: orderId,
      note: (note || `JOLOF TRADING order ${orderId}`).slice(0, 500),
      ...(email ? { buyerEmailAddress: email } : {}),
      ...(verificationToken ? { verificationToken } : {}),
    });
  } catch (e) {
    fail(402, friendly(e, 'We could not take your card payment. Please try again or choose cash on delivery.'));
  }
  const p = res.payment;
  if (!p || !['APPROVED', 'COMPLETED'].includes(p.status)) fail(402, 'Your card was not approved. Please try another card.');
  return prisma.payment.create({ data: { orderId, provider: 'square', providerId: p.id, ...snapshot(p) } });
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
