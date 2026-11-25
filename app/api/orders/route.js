import { route, body, fail, str, EMAIL } from '@/lib/server/http';
import { prisma } from '@/lib/server/db';
import { getUser } from '@/lib/server/auth';
import { getSettings } from '@/lib/server/settings';
import { createOrder, discardOrder, markCardCharged } from '@/lib/server/orders';
import { chargeCard, refundCard, squareEnabled } from '@/lib/server/square';
import { notify } from '@/lib/server/notify';
import { withState } from '@/lib/server/respond';
import { orderForCustomer } from '@/lib/server/state';

const cleanAddress = (a) => ({ label: str(a?.label, 40) || 'Delivery', line1: str(a?.line1, 160), city: str(a?.city, 80), state: str(a?.state, 4).toUpperCase(), postcode: str(a?.postcode, 12), country: 'United States' });

/**
 * Order from the storefront cart. JOLOF confirms prices and issues the invoice.
 *   cod  → "Cash / check on delivery": nothing paid online; the driver collects cash or a check.
 *   card → the card is charged now (order total includes the card processing fee, lib/cardfee.js). When JOLOF confirms at a different total, the difference is
 *          refunded or asked for as a separate balance payment (lib/server/payments.js).
 */
export const POST = route(async (req) => {
  const d = await body(req);
  const user = await getUser();
  const settings = await getSettings();
  if (!settings.showPricing) fail(400, 'Online ordering is paused — please send an inquiry instead.');
  if (user && user.role !== 'customer') fail(400, 'Sign in with a customer account to place an order.');
  if (user?.status === 'pending') fail(403, 'Your trade account is awaiting approval — send a quote request meanwhile.');
  // two options: card, or "Cash / check on delivery" (cod). An old client sending 'check' gets cod.
  const method = d.paymentMethod === 'card' ? 'card' : 'cod';
  const pay = settings.payments || {};
  const cardOn = !!pay.card && squareEnabled();
  const codOn = pay.cod !== false || pay.check === true || !cardOn; // same rule as the checkout options (lib/server/state.js)
  if (method === 'card' && !cardOn) fail(400, 'Card payments are not available right now — please choose another payment option.');
  if (method === 'cod' && !codOn) fail(400, 'Cash / check on delivery is not available — please pay by card.');
  const sourceId = str(d.sourceId, 400);
  if (method === 'card' && !sourceId) fail(400, 'Please enter your card details.');
  const guest = !user;
  const g = d.guest || {};
  if (guest && (str(g.name).length < 2 || !EMAIL.test(str(g.email)) || !str(g.phone))) fail(400, 'Please enter your name, email and phone.');
  let address = d.addressId && user ? user.addresses.find((a) => a.id === d.addressId) : d.address;
  if (!address) fail(400, 'Please choose a delivery address.');
  address = cleanAddress(address);
  if (!address.line1 || !address.city || !address.state || !address.postcode) fail(400, 'Please complete the delivery address.');

  const cart = (Array.isArray(d.items) ? d.items : []).map((i) => ({ productId: str(i.productId, 40), qty: Math.min(9999, parseInt(i.qty, 10) || 0) })).filter((i) => i.productId && i.qty > 0);
  if (!cart.length) fail(400, 'Your cart is empty.');
  const products = await prisma.product.findMany({ where: { id: { in: cart.map((c) => c.productId) }, status: 'active' } });
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  const bad = cart.filter((c) => !byId[c.productId] || byId[c.productId].price == null);
  if (bad.length) fail(400, 'Some items are price-on-request — send them as an inquiry instead.');
  const lines = cart.map((c) => { const p = byId[c.productId]; return { productId: p.id, name: p.name, size: [p.size, p.pack].filter(Boolean).join(' · '), img: p.img, qty: c.qty, price: p.price }; });

  const customer = user ? { name: user.name, email: user.email, phone: user.phone, company: user.company } : { name: str(g.name, 120), email: str(g.email, 160).toLowerCase(), phone: str(g.phone, 40), company: str(g.company, 160) };
  const { id, total } = await createOrder({ userId: user?.id || null, guest, customer, address, notes: str(d.notes, 2000), lines, by: customer.name, paymentMethod: method });

  if (method === 'card') {
    let payment = null;
    try {
      payment = await chargeCard({ orderId: id, amount: total, sourceId, verificationToken: str(d.verificationToken, 400) || undefined, email: customer.email, kind: 'checkout' });
      await markCardCharged(id, payment, 'Card charged at checkout');
    } catch (e) {
      // card not approved (or saving failed) → give back any charge, the order is not placed and its stock goes back
      if (payment) await refundCard(payment, payment.amount, 'Order could not be placed').catch((err) => console.error('[orders] refund failed', id, err));
      await discardOrder(id, customer.name).catch((err) => console.error('[orders] discard failed', id, err));
      throw e;
    }
  }
  notify.orderPlaced(id);
  return withState({ id, order: await orderForCustomer(id) });
});
