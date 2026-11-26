// Private payment links: /pay/<token>. Anyone holding the link can see what it is for and pay it
// (customers with or without an account — the link is the secret). Two kinds:
//   quote   → pays the quote total; creates the confirmed order + invoice, marks the quote accepted
//   balance → pays the extra amount on a card order whose confirmed total went up
import { prisma } from './db';
import { fail, round2, str } from './http';
import { getSettings } from './settings';
import { createOrder, discardOrder, markCardCharged } from './orders';
import { chargeCard, refundCard, squareEnabled } from './square';
import { refreshOrderPayment } from './payments';
import { notify } from './notify';
import { cardFeeFor } from '../cardfee';

const iso = (d) => (d ? new Date(d).toISOString() : null);
const quoteTotal = (q) => round2((q?.lines || []).reduce((s, l) => s + l.qty * l.unitPrice, 0) + (Number(q?.shipping) || 0) - (Number(q?.discount) || 0));
const expiredQuote = (q) => !!q?.validUntil && new Date(`${q.validUntil}T23:59:59`) < new Date();
const cleanAddress = (a) => a && ({ label: str(a.label, 40) || 'Delivery', line1: str(a.line1, 160), city: str(a.city, 80), state: str(a.state, 4).toUpperCase(), postcode: str(a.postcode, 12), country: 'United States' });
const fullAddress = (a) => !!(a && a.line1 && a.city && a.state && a.postcode);

async function load(token) {
  const req = token ? await prisma.paymentRequest.findUnique({ where: { token: String(token) } }) : null;
  if (!req) fail(404, 'This payment link is not valid. Please check the link in your email or contact us.');
  return req;
}

/** What the pay page shows (no internal / supplier details). */
export async function payPage(token) {
  const req = await load(token);
  const settings = await getSettings();
  const cardOn = !!settings.payments?.card && squareEnabled();
  const base = { id: req.id, kind: req.kind, amount: req.amount, reason: req.reason, status: req.status, createdAt: iso(req.createdAt), paidAt: iso(req.paidAt), name: req.name };
  const store = { name: settings.store.name, email: settings.store.email, phone: settings.store.phone };

  if (req.kind === 'quote') {
    const inq = await prisma.inquiry.findUnique({ where: { id: req.inquiryId || '' } });
    if (!inq?.quote) fail(404, 'This quote is no longer available.');
    const q = inq.quote;
    const expired = req.status === 'open' && expiredQuote(q);
    // paying by card adds the card processing fee — the same amount createOrder() charges (lib/cardfee.js)
    const total = quoteTotal(q);
    const cardFee = cardOn ? cardFeeFor(total, settings.payments?.cardFee) : 0;
    return {
      request: { ...base, amount: round2(total + cardFee) },
      quote: { id: inq.id, lines: q.lines.map((l) => ({ name: l.name, size: l.size, unit: l.unit, qty: l.qty, unitPrice: l.unitPrice })), shipping: Number(q.shipping) || 0, deliveryMiles: q.deliveryMiles, discount: Number(q.discount) || 0, validUntil: q.validUntil, note: q.note, total, cardFee, payTotal: round2(total + cardFee), status: inq.status },
      address: inq.address || null, needsAddress: !fullAddress(inq.address),
      orderId: inq.orderId, expired,
      // no card set up yet → the customer can still accept and pay cash on delivery
      pay: { card: cardOn, cod: !cardOn },
      store,
    };
  }

  const o = req.orderId ? await prisma.order.findUnique({ where: { id: req.orderId }, include: { items: { orderBy: { sort: 'asc' } } } }) : null;
  if (!o) fail(404, 'This order is no longer available.');
  return {
    request: base,
    order: {
      id: o.id, status: o.status, subtotal: o.subtotal, shipping: o.deliveryFee, discount: o.discount, cardFee: o.cardFee || 0, total: o.total,
      items: o.items.map((i) => ({ name: i.name, size: i.size, unit: i.unit, qty: i.qty, price: i.price })),
    },
    address: o.address, needsAddress: false, orderId: o.id, expired: false,
    pay: { card: cardOn, cod: false },
    store,
  };
}

/** Claim an open request so a double click / two tabs can't pay it twice. */
async function claim(req) {
  const r = await prisma.paymentRequest.updateMany({ where: { id: req.id, status: 'open' }, data: { status: 'processing' } });
  if (!r.count) fail(409, req.status === 'paid' ? 'This has already been paid — thank you!' : 'This payment link is no longer active.');
}
const release = (req) => prisma.paymentRequest.updateMany({ where: { id: req.id, status: 'processing' }, data: { status: 'open' } });

/**
 * Pay a link. d = { method: 'card' | 'cod', sourceId, verificationToken, address }
 * Returns { orderId }.
 */
export async function payByLink(token, d, user) {
  const req = await load(token);
  if (req.status !== 'open') fail(409, req.status === 'paid' ? 'This has already been paid — thank you!' : 'This payment link is no longer active. Please contact us for a new one.');
  const settings = await getSettings();
  const cardOn = !!settings.payments?.card && squareEnabled();
  const method = d.method === 'cod' ? 'cod' : 'card';
  if (method === 'card' && !cardOn) fail(400, 'Card payments are not available right now — please contact us.');
  if (method === 'cod' && (req.kind !== 'quote' || cardOn)) fail(400, 'Please pay by card.');
  const sourceId = str(d.sourceId, 400);
  if (method === 'card' && !sourceId) fail(400, 'Please enter your card details.');

  if (req.kind === 'quote') return payQuote(req, { method, sourceId, verificationToken: str(d.verificationToken, 400) || undefined, address: d.address, user });
  return payBalance(req, { sourceId, verificationToken: str(d.verificationToken, 400) || undefined });
}

async function payQuote(req, { method, sourceId, verificationToken, address, user }) {
  const inq = await prisma.inquiry.findUnique({ where: { id: req.inquiryId || '' } });
  if (!inq?.quote) fail(404, 'This quote is no longer available.');
  if (inq.status !== 'quoted') fail(409, inq.status === 'accepted' ? 'This quote has already been accepted.' : 'This quote can no longer be accepted.');
  if (expiredQuote(inq.quote)) fail(400, 'This quote has expired — ask us for an updated one.');
  const addr = fullAddress(inq.address) ? inq.address : cleanAddress(address);
  if (!fullAddress(addr)) fail(400, 'Please enter the full delivery address.');

  // attach the order to the customer's account when there is one (the inquiry's, or one with the same email)
  const account = inq.userId
    ? await prisma.user.findUnique({ where: { id: inq.userId } })
    : (user?.role === 'customer' && user.email.toLowerCase() === inq.email.toLowerCase() ? user
      : await prisma.user.findFirst({ where: { role: 'customer', email: { equals: inq.email, mode: 'insensitive' } } }));

  await claim(req);
  let orderId = null;
  let payment = null;
  try {
    const products = await prisma.product.findMany({ where: { id: { in: inq.quote.lines.map((l) => l.productId).filter(Boolean) } }, select: { id: true, img: true, size: true, pack: true } });
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    const created = await createOrder({
      userId: account?.id || null, guest: !account,
      customer: { name: account?.name || inq.name, email: account?.email || inq.email, phone: account?.phone || inq.phone, company: account?.company || inq.company },
      address: { label: addr.label || 'Delivery', line1: addr.line1, city: addr.city, state: addr.state, postcode: addr.postcode, country: addr.country || 'United States' },
      lines: inq.quote.lines.map((l) => ({ productId: l.productId || null, name: l.name, size: l.size || [byId[l.productId]?.size, byId[l.productId]?.pack].filter(Boolean).join(' · '), img: byId[l.productId]?.img || null, unit: l.unit, qty: l.qty, price: l.unitPrice })),
      source: 'quote', inquiryId: inq.id, fixedDeliveryFee: inq.quote.shipping || 0, discount: inq.quote.discount || 0, by: inq.name, paymentMethod: method,
    });
    orderId = created.id;
    if (method === 'card') {
      payment = await chargeCard({ orderId, amount: created.total, sourceId, verificationToken, email: inq.email, kind: 'quote', requestId: req.id, note: `JOLOF TRADE CENTER quote ${inq.id} → order ${orderId}` });
      await markCardCharged(orderId, payment, `Quote ${inq.id} paid by card`);
    }
    await prisma.$transaction(async (tx) => {
      await tx.paymentRequest.update({ where: { id: req.id }, data: method === 'card' ? { status: 'paid', paidAt: new Date(), orderId } : { status: 'cancelled', cancelledAt: new Date(), orderId, reason: `${req.reason} (accepted — cash on delivery)`.trim() } });
      await tx.inquiry.update({ where: { id: inq.id }, data: { status: 'accepted', orderId, userId: inq.userId || account?.id || null, notes: [...inq.notes, { by: inq.name, text: method === 'card' ? `Quote paid by card · order ${orderId}` : `Quote accepted (cash on delivery) · order ${orderId}`, at: new Date().toISOString() }] } });
      await refreshOrderPayment(tx, orderId);
    });
  } catch (e) {
    if (payment) await refundCard(payment, payment.amount, 'Quote order could not be placed').catch((err) => console.error('[paylinks] refund failed', req.id, err));
    if (orderId) await discardOrder(orderId, inq.name).catch((err) => console.error('[paylinks] discard failed', orderId, err));
    await release(req);
    throw e;
  }
  notify.quotePaid(req.id, orderId, { method });
  return { orderId };
}

async function payBalance(req, { sourceId, verificationToken }) {
  const o = req.orderId ? await prisma.order.findUnique({ where: { id: req.orderId } }) : null;
  if (!o) fail(404, 'This order is no longer available.');
  if (o.status === 'cancelled') fail(409, 'This order was cancelled — nothing to pay.');
  await claim(req);
  let payment = null;
  try {
    payment = await chargeCard({ orderId: o.id, amount: req.amount, sourceId, verificationToken, email: o.customer?.email, kind: 'balance', requestId: req.id, note: `JOLOF TRADE CENTER balance ${req.id} for order ${o.id}` });
    await prisma.$transaction(async (tx) => {
      await tx.paymentRequest.update({ where: { id: req.id }, data: { status: 'paid', paidAt: new Date() } });
    });
    await markCardCharged(o.id, payment, `Balance ${req.id} paid by card`);
  } catch (e) {
    if (payment) {
      // charged but couldn't record it — keep the money recorded rather than double-charging later
      console.error('[paylinks] balance charged but not recorded', req.id, e);
      await prisma.paymentRequest.updateMany({ where: { id: req.id }, data: { status: 'paid', paidAt: new Date() } }).catch(() => {});
      throw e;
    }
    await release(req);
    throw e;
  }
  notify.paymentReceived(req.id);
  return { orderId: o.id };
}
