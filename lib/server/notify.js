// Who gets which email, at every step. Each function returns immediately; the email is built and
// sent after the response (mail.later), so SMTP problems never block an order or a payment.
//
// Customer: order placed · order confirmed / re-priced (refund or balance link) · balance link ·
//           payment received · refund · out for delivery · delivered · cancelled ·
//           request received · quote (with private pay link) · quote paid → order confirmed
// Staff:    new order · new inquiry · quote paid · quote declined · balance paid · order cancelled by customer
import { prisma } from './db';
import { getSettings } from './settings';
import { deliver, later, adminRecipients } from './mail';
import { appUrl, payUrl, netPaid } from './payments';
import { squareEnabled } from './square';
import { cardFeeFor } from '../cardfee';
import { layout, toText, p, h2, button, box, items, totals, details, addressHtml, esc, usd, fmtDay } from './emails';

const orderInclude = { items: { orderBy: { sort: 'asc' } }, invoice: true, payments: { orderBy: { createdAt: 'asc' } }, requests: true };
const loadOrder = (id) => prisma.order.findUnique({ where: { id }, include: orderInclude });
const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || 'there';
const cardLabel = (pay) => [pay?.cardBrand && pay.cardBrand.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()), pay?.last4 && `ending ${pay.last4}`].filter(Boolean).join(' ');
const accountOrderUrl = (o) => (o.userId ? `${appUrl()}/account/orders/${o.id}` : null);
const adminOrderUrl = (id) => `${appUrl()}/admin/orders/${id}`;
const adminInquiryUrl = (id) => `${appUrl()}/admin/inquiries/${id}`;
const lastCharge = (o) => [...(o.payments || [])].reverse().find((x) => x.status === 'COMPLETED');

async function mail({ to, title, preheader, body, template, orderId, inquiryId, staff = false }) {
  const settings = await getSettings();
  const html = layout({ title, preheader, body, store: settings.store, appUrl: appUrl() });
  await deliver({
    to: staff ? adminRecipients(settings) : to, subject: title, html, text: toText(html), template,
    orderId, inquiryId, replyTo: staff ? undefined : settings.store?.email,
  });
}

const orderLines = (o) => items(o.items.map((i) => ({ name: i.name, size: i.size, qty: i.qty, unit: i.unit, price: i.price })));
const orderTotals = (o, { estimate = false } = {}) => totals([
  ['Subtotal', usd(o.subtotal)],
  [`Delivery${o.deliveryMiles ? ` · ~${Math.round(o.deliveryMiles)} mi` : ''}`, o.deliveryFee ? usd(o.deliveryFee) : 'Free'],
  o.discount > 0 && ['Discount', `−${usd(o.discount)}`],
  o.cardFee > 0 && ['Card processing fee', usd(o.cardFee)],
  [estimate ? 'Estimated total' : 'Total', `${usd(o.total)} USD`, true],
]);
const customerBlock = (o) => details([
  ['Customer', esc([o.customer?.name, o.customer?.company].filter(Boolean).join(' · '))],
  ['Email', esc(o.customer?.email)], ['Phone', esc(o.customer?.phone)], ['Deliver to', addressHtml(o.address)],
]);

/* ------------------------------------------------------------------ orders */

/** "Cash / check on delivery" (older check-only orders say "Check on delivery"). */
const onDeliveryLabel = (o) => (o.paymentMethod === 'check' ? 'Check on delivery' : 'Cash / check on delivery');
const isOnDelivery = (o) => ['cod', 'check'].includes(o.paymentMethod || 'cod');
/** What the customer should have ready for the driver. */
const payDriver = (o, amount) => (o.paymentMethod === 'check'
  ? `please have a check for <b>${amount}</b>, made payable to JOLOF TRADE CENTER, ready for our driver.`
  : `please have <b>${amount}</b> ready for our driver — in cash, or a check made payable to JOLOF TRADE CENTER.`);

export const notify = {
  /** Checkout finished (cash / check on delivery, or card charged). */
  orderPlaced(orderId) {
    later('orderPlaced', async () => {
      const o = await loadOrder(orderId);
      if (!o) return;
      const card = o.paymentMethod === 'card' ? lastCharge(o) : null;
      const url = accountOrderUrl(o);
      await mail({
        to: o.customer?.email, template: 'order_placed', orderId,
        title: card ? `Order ${o.id} — payment received` : `Order ${o.id} received`,
        preheader: card ? `We charged ${usd(card.amount)} to your card. Our team is confirming your order.` : 'Thanks — our team is confirming availability and delivery.',
        body: [
          p(`Hi ${esc(firstName(o.customer?.name))},`),
          p(`Thank you for your order. Our team is now confirming stock and delivery — we'll email you again as soon as it's confirmed, with your invoice.`),
          card
            ? box(`<b>Paid by card:</b> ${usd(card.amount)}${cardLabel(card) ? ` (${esc(cardLabel(card))})` : ''}.<br>If the confirmed total is lower we refund the difference to your card. If it's higher, we'll email you a secure link to pay only the extra.`, 'success')
            : box(`<b>${onDeliveryLabel(o)}:</b> nothing to pay now. ${o.paymentMethod === 'check' ? 'Please have a check for the final invoice amount, made payable to JOLOF TRADE CENTER, ready for our driver.' : 'Please have the final invoice amount ready for our driver — in cash, or a check made payable to JOLOF TRADE CENTER.'}`, 'warn'),
          h2('Your order'), orderLines(o), orderTotals(o, { estimate: true }),
          h2('Delivery'), p(addressHtml(o.address) || '—'),
          url ? button('View your order', url, 'navy') : p(`Your order number is <b>${esc(o.id)}</b> — quote it if you contact us.`),
        ].join(''),
      });
      await mail({
        staff: true, template: 'admin_new_order', orderId,
        title: `New order ${o.id} · ${usd(o.total)} · ${card ? 'paid by card' : onDeliveryLabel(o).toLowerCase()}`,
        body: [
          p(`A new order needs confirming${o.guest ? ' (guest checkout)' : ''}.`),
          customerBlock(o), h2('Items'), orderLines(o), orderTotals(o, { estimate: true }),
          o.notes ? box(`<b>Customer note:</b> ${esc(o.notes)}`, 'info') : '',
          button('Open order in admin', adminOrderUrl(o.id), 'navy'),
        ].join(''),
      });
    });
  },

  /** Admin confirmed the order (or changed prices after). Explains refund / balance due. */
  orderConfirmed(orderId, { updated = false, refunded = 0, requestId = null, note = '' } = {}) {
    later('orderConfirmed', async () => {
      const o = await loadOrder(orderId);
      if (!o) return;
      const req = requestId ? o.requests.find((r) => r.id === requestId) : null;
      const url = accountOrderUrl(o);
      let payment;
      if (o.paymentMethod === 'card') {
        const paid = netPaid(o.payments);
        payment = req
          ? box(`<b>Balance to pay: ${usd(req.amount)}</b><br>The confirmed total (${usd(o.total)}) is higher than the ${usd(paid)} you paid at checkout. Please pay the difference with the secure link below — we'll deliver once it's paid.`, 'warn') + button(`Pay ${usd(req.amount)} now`, payUrl(req.token))
          : refunded > 0
            ? box(`<b>${usd(refunded)} refunded to your card.</b> The confirmed total is lower than what you paid, so we've refunded the difference. Refunds usually show on your statement within 5–10 business days.`, 'success')
            : box(`<b>Paid in full by card</b> — nothing more to pay.`, 'success');
      } else {
        payment = box(`<b>${onDeliveryLabel(o)}:</b> ${payDriver(o, usd(o.total))}`, 'warn');
      }
      await mail({
        to: o.customer?.email, template: updated ? 'order_updated' : 'order_confirmed', orderId,
        title: updated ? `Order ${o.id} updated — new total ${usd(o.total)}` : `Order ${o.id} confirmed${o.invoice ? ` — invoice ${o.invoice.id}` : ''}`,
        preheader: req ? `Balance of ${usd(req.amount)} to pay.` : `Total ${usd(o.total)}.`,
        body: [
          p(`Hi ${esc(firstName(o.customer?.name))},`),
          p(updated ? `We've updated the pricing on your order <b>${esc(o.id)}</b>. Here is the revised invoice.` : `Good news — your order <b>${esc(o.id)}</b> is confirmed and your invoice${o.invoice ? ` <b>${esc(o.invoice.id)}</b>` : ''} is ready.`),
          note ? box(esc(note), 'info') : '',
          payment,
          h2('Invoice'), orderLines(o), orderTotals(o),
          h2('Delivery'), p(addressHtml(o.address) || '—'),
          url ? button('View order & invoice', url, 'navy') : '',
        ].join(''),
      });
    });
  },

  /** Balance link (re)sent on its own. */
  paymentRequest(requestId) {
    later('paymentRequest', async () => {
      const r = await prisma.paymentRequest.findUnique({ where: { id: requestId } });
      if (!r || r.status !== 'open' || !r.orderId) return;
      const o = await loadOrder(r.orderId);
      await mail({
        to: r.email || o?.customer?.email, template: 'payment_request', orderId: r.orderId,
        title: `Payment of ${usd(r.amount)} for order ${r.orderId}`,
        preheader: 'Secure card payment link inside.',
        body: [
          p(`Hi ${esc(firstName(r.name || o?.customer?.name))},`),
          p(`${esc(r.reason || `There is an amount to pay on order ${r.orderId}.`)}`),
          box(`<b>Amount due: ${usd(r.amount)}</b> · reference ${esc(r.id)}`, 'warn'),
          button(`Pay ${usd(r.amount)} securely`, payUrl(r.token)),
          p('The link is private to you — please don\'t forward it.', 'font-size:13px;color:#5f6873;'),
        ].join(''),
      });
    });
  },

  /** A balance link was paid. */
  paymentReceived(requestId) {
    later('paymentReceived', async () => {
      const r = await prisma.paymentRequest.findUnique({ where: { id: requestId } });
      if (!r?.orderId) return;
      const o = await loadOrder(r.orderId);
      const pay = o.payments.find((x) => x.requestId === r.id && x.status === 'COMPLETED');
      await mail({
        to: o.customer?.email, template: 'payment_received', orderId: o.id,
        title: `Payment received — ${usd(r.amount)} for order ${o.id}`,
        body: [
          p(`Hi ${esc(firstName(o.customer?.name))},`),
          p(`Thank you — we've received your payment of <b>${usd(r.amount)}</b>${pay && cardLabel(pay) ? ` (${esc(cardLabel(pay))})` : ''} for order <b>${esc(o.id)}</b>. Your order is now paid in full.`),
          pay?.receiptUrl ? p(`<a href="${esc(pay.receiptUrl)}" style="color:#07563C;font-weight:700;">View your card receipt</a>`) : '',
          accountOrderUrl(o) ? button('View your order', accountOrderUrl(o), 'navy') : '',
        ].join(''),
      });
      await mail({ staff: true, template: 'admin_payment_received', orderId: o.id, title: `Balance ${r.id} paid · ${usd(r.amount)} · order ${o.id}`, body: [p(`${esc(o.customer?.name)} paid the balance for <b>${esc(o.id)}</b>. The order can now be delivered.`), button('Open order', adminOrderUrl(o.id), 'navy')].join('') });
    });
  },

  /** Admin refunded part of a card order. */
  refunded(orderId, amount, reason = '') {
    later('refunded', async () => {
      const o = await loadOrder(orderId);
      if (!o) return;
      await mail({
        to: o.customer?.email, template: 'refund', orderId,
        title: `Refund of ${usd(amount)} for order ${o.id}`,
        body: [
          p(`Hi ${esc(firstName(o.customer?.name))},`),
          p(`We've refunded <b>${usd(amount)}</b> to your card for order <b>${esc(o.id)}</b>${reason ? ` (${esc(reason)})` : ''}. Refunds usually appear on your statement within 5–10 business days.`),
          accountOrderUrl(o) ? button('View your order', accountOrderUrl(o), 'navy') : '',
        ].join(''),
      });
    });
  },

  /** Order moved: shipped (out for delivery) · delivered · cancelled. Other steps send nothing. */
  orderStatus(orderId, status, { note = '', refunded = 0 } = {}) {
    if (!['shipped', 'delivered', 'cancelled'].includes(status)) return;
    later('orderStatus', async () => {
      const o = await loadOrder(orderId);
      if (!o) return;
      const driver = o.driverId ? await prisma.driver.findUnique({ where: { id: o.driverId } }) : null;
      const url = accountOrderUrl(o);
      const hi = p(`Hi ${esc(firstName(o.customer?.name))},`);
      if (status === 'shipped') {
        await mail({
          to: o.customer?.email, template: 'order_shipped', orderId,
          title: `Order ${o.id} is on its way`,
          body: [hi, p('Your order has left our warehouse and is on its way to you.'),
            details([['Driver', driver && esc(driver.name)], ['Driver phone', driver?.phone && `<a href="tel:${esc(driver.phone)}" style="color:#07563C;">${esc(driver.phone)}</a>`], ['Vehicle', driver && esc([driver.vehicle, driver.plate].filter(Boolean).join(' · '))], ['Tracking', o.tracking && esc(o.tracking)], ['Deliver to', addressHtml(o.address)]]),
            isOnDelivery(o) && o.payment !== 'paid' ? box(`<b>${onDeliveryLabel(o)}:</b> ${payDriver(o, usd(o.total))}`, 'warn') : '',
            url ? button('Track your order', url, 'navy') : ''].join(''),
        });
      } else if (status === 'delivered') {
        await mail({
          to: o.customer?.email, template: 'order_delivered', orderId,
          title: `Order ${o.id} delivered`,
          body: [hi, p(`Your order <b>${esc(o.id)}</b> has been delivered. Thank you for trading with us!`),
            isOnDelivery(o) ? box(`<b>${o.paymentMethod === 'check' ? 'Check' : 'Payment'} received:</b> ${usd(o.total)} — your invoice${o.invoice ? ` ${esc(o.invoice.id)}` : ''} is marked paid.`, 'success') : '',
            url ? button('View order & invoice', url, 'navy') : ''].join(''),
        });
      } else {
        const byCustomer = note === 'Cancelled by customer';
        await mail({
          to: o.customer?.email, template: 'order_cancelled', orderId,
          title: `Order ${o.id} cancelled`,
          body: [hi, p(byCustomer ? `As requested, your order <b>${esc(o.id)}</b> has been cancelled.` : `Your order <b>${esc(o.id)}</b> has been cancelled${note ? ` (${esc(note)})` : ''}.`),
            refunded > 0 ? box(`<b>${usd(refunded)} refunded to your card.</b> Refunds usually show within 5–10 business days.`, 'success') : '',
            p('If this is unexpected, just reply to this email and our team will help.')].join(''),
        });
        if (byCustomer) await mail({ staff: true, template: 'admin_order_cancelled', orderId, title: `Order ${o.id} cancelled by the customer`, body: [p(`${esc(o.customer?.name)} cancelled <b>${esc(o.id)}</b> (${usd(o.total)}). Stock went back to the warehouses.${refunded > 0 ? ` ${usd(refunded)} was refunded to their card.` : ''}`), button('Open order', adminOrderUrl(o.id), 'navy')].join('') });
      }
    });
  },

  /**
   * Driver assigned (or admin pressed "Email slip to driver") → the driver gets the delivery slip:
   * where to pick each item up, where to drop it, quantities and what to collect. No prices.
   */
  driverAssigned(orderId, { resend = false } = {}) {
    later('driverAssigned', async () => {
      const o = await loadOrder(orderId);
      if (!o?.driverId || o.status === 'cancelled') return;
      const driver = await prisma.driver.findUnique({ where: { id: o.driverId } });
      if (!driver?.email) return;
      const whIds = [...new Set(o.items.map((i) => i.warehouseId).filter(Boolean))];
      const whs = whIds.length ? await prisma.warehouse.findMany({ where: { id: { in: whIds } }, include: { vendor: { select: { name: true, company: true, phone: true, isHouse: true } } } }) : [];
      const whById = Object.fromEntries(whs.map((w) => [w.id, w]));
      const addrLine = (x) => [x?.line1, [x?.city, x?.state].filter(Boolean).join(', '), x?.postcode].filter(Boolean).join(' ');
      const maps = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
      const mapsLink = (q) => (q ? ` · <a href="${esc(maps(q))}" style="color:#07563C;font-weight:700;">Open in Maps</a>` : '');
      const unitOf = (i) => (i.unit && i.unit !== 'units' ? i.unit : 'units');

      // one pickup stop per warehouse, in the order the items appear (same as the printable slip)
      const stops = [];
      o.items.forEach((i) => {
        const key = i.warehouseId || (i.productId ? 'unassigned' : 'direct');
        let st = stops.find((x) => x.key === key);
        if (!st) { st = { key, w: whById[i.warehouseId], items: [] }; stops.push(st); }
        st.items.push(i);
      });
      const stopHtml = stops.map((st, n) => {
        const w = st.w;
        const head = w
          ? `<b style="color:#0B2347;">${n + 1}. ${esc(w.name)}</b><br>${esc(addrLine(w))}${mapsLink(addrLine(w))}<br><span style="color:#5f6873;">${esc(w.vendor?.isHouse ? 'JOLOF TRADE CENTER' : w.vendor?.company || w.vendor?.name || '')}${w.vendor?.phone ? ` · ${esc(w.vendor.phone)}` : ''}</span>`
          : st.key === 'direct' ? `<b style="color:#0B2347;">${n + 1}. Direct from JOLOF TRADE CENTER</b>` : `<b style="color:#B4432F;">${n + 1}. Pickup location not assigned yet — check with dispatch</b>`;
        const rows = st.items.map((i) => `<tr><td style="padding:7px 0;border-bottom:1px solid #E7E3D8;font-size:14px;color:#18232E;">☐ <b style="color:#0B2347;">${esc(i.name)}</b>${i.size ? `<br><span style="font-size:12px;color:#5f6873;">${esc(i.size)}</span>` : ''}</td><td style="padding:7px 0;border-bottom:1px solid #E7E3D8;font-size:14px;font-weight:800;color:#0B2347;text-align:right;white-space:nowrap;">${esc(i.qty)} ${esc(unitOf(i))}</td></tr>`).join('');
        return box(head, 'info') + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:-6px 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${rows}</table>`;
      }).join('');

      const c = o.customer || {};
      const units = o.items.reduce((t, i) => t + (Number(i.qty) || 0), 0);
      const collect = o.paymentMethod === 'card'
        ? box('<b>Paid by card</b> — do not collect any money.', 'success')
        : o.payment === 'paid'
          ? box(`<b>${onDeliveryLabel(o)}</b> — already collected.`, 'success')
          : box(`<b>${onDeliveryLabel(o)}:</b> collect <b>${usd(o.total)}</b> at drop-off${o.paymentMethod === 'check' ? ' by check' : ' in cash or by check'} (checks payable to JOLOF TRADE CENTER).`, 'warn');

      await mail({
        to: driver.email, template: 'driver_slip', orderId,
        title: `${resend ? 'Driver slip' : 'New delivery'} — order ${o.id}`,
        preheader: `${stops.length} pickup stop${stops.length === 1 ? '' : 's'} · deliver to ${[o.address?.city, o.address?.state].filter(Boolean).join(', ')}`,
        body: [
          p(`Hi ${esc(firstName(driver.name))},`),
          p(resend ? `Here is the delivery slip for order <b>${esc(o.id)}</b>.` : `You've been assigned order <b>${esc(o.id)}</b>. Your delivery slip is below.`),
          details([['Order', `<b>${esc(o.id)}</b>`], ['Order date', esc(fmtDay(o.createdAt.toISOString()))], ['Load', `${o.items.length} line${o.items.length === 1 ? '' : 's'} · ${units} unit${units === 1 ? '' : 's'}`], ['Distance', o.deliveryMiles ? `~${Math.round(o.deliveryMiles)} mi` : ''], ['Tracking', o.tracking && esc(o.tracking)]]),
          h2('Pick up'), stopHtml,
          h2('Drop off'),
          details([['Deliver to', `<b>${esc(c.company || c.name)}</b>${c.company && c.name ? `<br>Attn: ${esc(c.name)}` : ''}`], ['Phone', c.phone && `<a href="tel:${esc(c.phone)}" style="color:#07563C;">${esc(c.phone)}</a>`], ['Address', o.address ? `${addressHtml(o.address)}${mapsLink(addrLine(o.address))}` : 'No address on file — call the customer.']]),
          o.notes ? box(`<b>Customer note:</b> ${esc(o.notes)}`, 'info') : '',
          collect,
          p('Please get the receiver\'s name and signature on delivery. Questions? Reply to this email or call dispatch.', 'font-size:13px;color:#5f6873;'),
        ].join(''),
      });
    });
  },

  /* ------------------------------------------------------------------ inquiries & quotes */

  /** Quote / contact request submitted. */
  inquiryReceived(inquiryId) {
    later('inquiryReceived', async () => {
      const q = await prisma.inquiry.findUnique({ where: { id: inquiryId } });
      if (!q) return;
      const list = (q.items || []).length ? items(q.items.map((i) => ({ name: i.name, qty: i.qty, unit: i.unit, price: null }))) : '';
      const contact = q.type === 'contact';
      await mail({
        to: q.email, template: 'inquiry_received', inquiryId,
        title: contact ? 'We received your message' : `Quote request ${q.id} received`,
        body: [p(`Hi ${esc(firstName(q.name))},`),
          p(contact ? 'Thanks for getting in touch — our team will reply shortly.' : `Thanks — we've received your request <b>${esc(q.id)}</b>. Our team will price it and email you a quote, usually within one business day.`),
          list && h2('What you asked for'), list,
          q.message ? box(esc(q.message).replace(/\n/g, '<br>'), 'info') : ''].join(''),
      });
      await mail({
        staff: true, template: 'admin_new_inquiry', inquiryId,
        title: `New ${contact ? 'message' : 'quote request'} ${q.id} from ${q.company || q.name}`,
        body: [details([['From', esc([q.name, q.company].filter(Boolean).join(' · '))], ['Email', esc(q.email)], ['Phone', esc(q.phone)], ['Department', esc(q.dept)]]),
          list && h2('Items'), list, q.message ? box(esc(q.message).replace(/\n/g, '<br>'), 'info') : '',
          button('Open in admin', adminInquiryUrl(q.id), 'navy')].join(''),
      });
    });
  },

  /** Admin sent (or re-sent) a quote → private link to review and pay. */
  quoteSent(inquiryId, requestId) {
    later('quoteSent', async () => {
      const [q, r] = await Promise.all([prisma.inquiry.findUnique({ where: { id: inquiryId } }), prisma.paymentRequest.findUnique({ where: { id: requestId } })]);
      if (!q?.quote || !r || r.status !== 'open') return;
      const qt = q.quote;
      const total = r.amount;
      // paid by card from the link → the card processing fee is added (shown so the pay page holds no surprise)
      const settings = await getSettings();
      const fee = settings.payments?.card && squareEnabled() ? cardFeeFor(total, settings.payments?.cardFee) : 0;
      const payTotal = Math.round((total + fee) * 100) / 100;
      const hasAccount = q.userId || await prisma.user.findFirst({ where: { role: 'customer', email: { equals: q.email, mode: 'insensitive' } }, select: { id: true } });
      await mail({
        to: q.email, template: 'quote_sent', inquiryId,
        title: `Your quote ${q.id} from JOLOF TRADE CENTER — ${usd(total)}`,
        preheader: `Valid until ${fmtDay(qt.validUntil)}. Review and pay securely online.`,
        body: [p(`Hi ${esc(firstName(q.name))},`),
          p(`Here is your quotation for request <b>${esc(q.id)}</b>. Review it and pay securely by card to confirm your order — we'll then schedule delivery.`),
          h2('Quotation'), items(qt.lines.map((l) => ({ name: l.name, size: l.size, qty: l.qty, unit: l.unit, price: l.unitPrice }))),
          totals([[`Delivery${qt.deliveryMiles ? ` · ~${Math.round(qt.deliveryMiles)} mi` : ''}`, Number(qt.shipping) ? usd(Number(qt.shipping)) : 'Included'], Number(qt.discount) > 0 && ['Discount', `−${usd(Number(qt.discount))}`], fee > 0 ? ['Quote total', usd(total)] : ['Quote total', `${usd(total)} USD`, true], fee > 0 && ['Card processing fee', usd(fee)], fee > 0 && ['Total by card', `${usd(payTotal)} USD`, true]]),
          qt.note ? box(esc(qt.note), 'info') : '',
          qt.validUntil ? p(`This quote is valid until <b>${esc(fmtDay(qt.validUntil))}</b>.`) : '',
          button(`Review & pay ${usd(payTotal)}`, payUrl(r.token)),
          p(hasAccount ? 'You can also find this quote under <b>Quotes</b> in your JOLOF account.' : 'No account needed — the link above is private to you, so please don\'t forward it.', 'font-size:13px;color:#5f6873;')].join(''),
      });
    });
  },

  quoteDeclined(inquiryId) {
    later('quoteDeclined', async () => {
      const q = await prisma.inquiry.findUnique({ where: { id: inquiryId } });
      if (!q) return;
      await mail({ staff: true, template: 'admin_quote_declined', inquiryId, title: `Quote ${q.id} declined by ${q.company || q.name}`, body: [p(`${esc(q.name)} declined the quote for <b>${esc(q.id)}</b>. You can reopen the inquiry and send a revised quote.`), button('Open inquiry', adminInquiryUrl(q.id), 'navy')].join('') });
    });
  },

  /** Quote paid (or accepted for cash on delivery) → confirmed order. */
  quotePaid(requestId, orderId, { method = 'card' } = {}) {
    later('quotePaid', async () => {
      const o = await loadOrder(orderId);
      if (!o) return;
      const pay = lastCharge(o);
      const url = accountOrderUrl(o);
      await mail({
        to: o.customer?.email, template: 'quote_paid', orderId, inquiryId: o.inquiryId,
        title: `Order ${o.id} confirmed — ${method === 'card' ? 'payment received' : 'pay on delivery'}`,
        body: [p(`Hi ${esc(firstName(o.customer?.name))},`),
          p(`Thank you — your quote <b>${esc(o.inquiryId)}</b> is accepted and order <b>${esc(o.id)}</b> is confirmed${o.invoice ? ` (invoice ${esc(o.invoice.id)})` : ''}. We'll be in touch about delivery.`),
          method === 'card'
            ? box(`<b>Paid by card:</b> ${usd(pay?.amount ?? o.total)}${pay && cardLabel(pay) ? ` (${esc(cardLabel(pay))})` : ''} — nothing more to pay.`, 'success')
            : box(`<b>Cash / check on delivery:</b> please have <b>${usd(o.total)}</b> ready for our driver — in cash, or a check made payable to JOLOF TRADE CENTER.`, 'warn'),
          pay?.receiptUrl ? p(`<a href="${esc(pay.receiptUrl)}" style="color:#07563C;font-weight:700;">View your card receipt</a>`) : '',
          h2('Your order'), orderLines(o), orderTotals(o),
          h2('Delivery'), p(addressHtml(o.address) || '—'),
          url ? button('View your order', url, 'navy') : ''].join(''),
      });
      await mail({
        staff: true, template: 'admin_quote_paid', orderId, inquiryId: o.inquiryId,
        title: `Quote ${o.inquiryId} ${method === 'card' ? `paid · ${usd(o.total)}` : 'accepted (cash / check on delivery)'} → order ${o.id}`,
        body: [p(`${esc(o.customer?.name)} ${method === 'card' ? 'paid' : 'accepted'} quote <b>${esc(o.inquiryId)}</b>. Order <b>${esc(o.id)}</b> is confirmed — assign a driver when ready.`), customerBlock(o), button('Open order', adminOrderUrl(o.id), 'navy')].join(''),
      });
    });
  },
};
