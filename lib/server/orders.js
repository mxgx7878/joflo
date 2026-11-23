// Order lifecycle on the server: create (routed + stock reserved), confirm & invoice,
// status changes, supplier fulfilment, decline & re-route, manual reassignment, cancel.
import { geoOf } from '../usgeo';
import { prisma } from './db';
import { fail, round2 } from './http';
import { resolveAddress, milesTo } from './maps';
import { routeOrder } from './routing';
import { getSettings, nextNumber, DEFAULT_SETTINGS } from './settings';
import { deliveryFee, orderDeliveryFee } from '../delivery';
import { syncPayment } from './square';
import { settleCardTotal, applyBalance, settleCancellation, refundOrderCard, refreshOrderPayment, openBalance } from './payments';
import { notify } from './notify';

const nowIso = () => new Date().toISOString();
export const ORDER_FLOW = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];
export const FUL_FLOW = ['assigned', 'accepted', 'packed', 'shipped', 'delivered'];
const ORDER_TO_FUL = { pending: 'assigned', confirmed: 'accepted', packed: 'packed', shipped: 'shipped', delivered: 'delivered' };
const RANK = Object.fromEntries(ORDER_FLOW.map((s, i) => [s, i]));

const fullOrder = (db, id) => db.order.findUnique({ where: { id }, include: { items: { orderBy: { sort: 'asc' } }, fulfilments: true, invoice: true } });

/** Merge duplicate product lines so stock checks are per product. */
function mergeLines(lines) {
  const out = [];
  const byProduct = new Map();
  lines.forEach((l) => {
    if (l.productId && byProduct.has(l.productId)) { byProduct.get(l.productId).qty += l.qty; return; }
    const copy = { ...l };
    out.push(copy);
    if (l.productId) byProduct.set(l.productId, copy);
  });
  return out;
}

/** Change the stock level only (no log row). Reserving fails if the warehouse no longer has enough. */
async function shiftStock(tx, { warehouseId, productId, delta }) {
  if (delta < 0) {
    const r = await tx.stockLevel.updateMany({ where: { warehouseId, productId, qty: { gte: -delta } }, data: { qty: { decrement: -delta } } });
    if (!r.count) fail(409, 'Stock changed while placing this order — please try again.');
  } else {
    await tx.stockLevel.upsert({ where: { warehouseId_productId: { warehouseId, productId } }, create: { warehouseId, productId, qty: delta }, update: { qty: { increment: delta } } });
  }
}

/** Reserve (delta < 0) or return (delta > 0) stock in one warehouse, logging the move. */
async function moveStock(tx, { warehouseId, productId, vendorId, delta, reason, by }) {
  if (!warehouseId || !productId || !delta) return;
  await shiftStock(tx, { warehouseId, productId, delta });
  await tx.stockLog.create({ data: { productId, warehouseId, vendorId, change: delta, reason, by } });
}

/** Same as moveStock for many lines, with one insert for all the log rows (fewer round trips). */
async function moveStockMany(tx, moves, { reason, by }) {
  const real = moves.filter((m) => m.warehouseId && m.productId && m.delta);
  for (const m of real) await shiftStock(tx, m);
  if (real.length) await tx.stockLog.createMany({ data: real.map((m) => ({ productId: m.productId, warehouseId: m.warehouseId, vendorId: m.vendorId, change: m.delta, reason, by })) });
}

const whLabel = async (db, ids) => {
  const ws = await db.warehouse.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  return Object.fromEntries(ws.map((w) => [w.id, w.name]));
};

function routingNote(items, names, cityLabel) {
  const by = {};
  items.forEach((i) => { const k = i.warehouseId || 'none'; by[k] = by[k] || { n: 0, house: i.isHouse, mi: i.distanceMi }; by[k].n += 1; });
  const parts = Object.entries(by).map(([k, g]) => (k === 'none' ? `${g.n} line(s) need a supplier` : `${g.n} line(s) → ${names[k] || k}${g.house ? ' (JOLOF stock)' : ''}${g.mi != null ? ` · ${g.mi} mi` : ''}`));
  return `Routed for ${cityLabel || 'the delivery address'}: ${parts.join('; ')}.`;
}

/** Group items into shipments (one per warehouse) with road miles. */
function shipmentsOf(items) {
  const map = new Map();
  items.forEach((i) => { if (i.warehouseId && !map.has(i.warehouseId)) map.set(i.warehouseId, i.distanceMi ?? null); });
  return [...map.entries()].map(([warehouseId, miles]) => ({ warehouseId, miles }));
}

export const CARD_NOTE = 'Paid by card through Square. If the confirmed total differs from what you paid, the difference is refunded to your card or sent to you as a separate payment link.';
const INVOICE_STATUS_OF = { paid: 'paid', partially_refunded: 'paid', refunded: 'paid', partially_paid: 'partially_paid' };

function invoiceData(order, settings) {
  const lines = order.items.map((i) => ({ name: i.name, size: i.size, unit: i.unit, qty: i.qty, price: i.price ?? 0, amount: round2((i.price ?? 0) * i.qty) }));
  // cash / check on delivery → due on delivery; card → charged on confirmation. None has a "due in N days" date.
  const method = order.paymentMethod || 'cod';
  const due = ['cod', 'check', 'card'].includes(method) ? null : new Date(Date.now() + (Number(settings.invoice?.dueDays) || 7) * 864e5);
  return {
    billTo: order.customer, shipTo: order.address ?? undefined, lines, subtotal: order.subtotal, deliveryFee: order.deliveryFee,
    discount: order.discount, total: order.total, status: INVOICE_STATUS_OF[order.payment] || 'unpaid', dueAt: due,
    notes: method === 'card' ? CARD_NOTE
      : method === 'check' ? settings.invoice?.checkNote || DEFAULT_SETTINGS.invoice.checkNote
        : settings.invoice?.payTo || DEFAULT_SETTINGS.invoice.payTo,
  };
}

/** Final prices / totals an admin is about to confirm (validates, doesn't save). */
function finalTotals(o, { prices = {}, deliveryFee: fee, discount } = {}) {
  const items = o.items.map((it) => {
    const v = prices[it.id];
    if (v === undefined || v === '' || v === null) return it;
    const p = round2(v);
    if (p < 0) fail(400, 'Prices cannot be negative.');
    return { ...it, price: p };
  });
  if (items.some((i) => i.price == null)) fail(400, 'Set a price for every line before confirming.');
  const subtotal = round2(items.reduce((s, i) => s + i.price * i.qty, 0));
  const dFee = fee !== undefined && fee !== '' && fee !== null ? round2(fee) : o.deliveryFee;
  const disc = discount !== undefined && discount !== '' && discount !== null ? round2(discount) : o.discount;
  return { items, subtotal, deliveryFee: dFee, discount: disc, total: round2(subtotal + dFee - disc) };
}

const cardLabel = (p) => [p?.cardBrand && p.cardBrand.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()), p?.last4 && `····${p.last4}`].filter(Boolean).join(' ');

async function upsertInvoice(tx, order, settings) {
  const data = invoiceData(order, settings);
  const existing = await tx.invoice.findUnique({ where: { orderId: order.id } });
  if (existing) return tx.invoice.update({ where: { orderId: order.id }, data: { ...data, issuedAt: new Date() } });
  return tx.invoice.create({ data: { id: order.id.replace(/^JT-/, 'INV-'), orderId: order.id, ...data } });
}

/**
 * Create an order. lines: [{ productId?, name, size, img, unit, qty, price? }]
 * source 'checkout' → pending (awaiting JOLOF confirmation, invoice on confirm)
 * source 'quote'    → confirmed straight away (prices agreed) + invoice issued
 * paymentMethod 'cod'   → the driver collects cash and the order is marked paid on delivery.
 * paymentMethod 'check' → the driver collects a check and the order is marked paid on delivery.
 * paymentMethod 'card' → the caller charges the card right after (app/api/orders/route.js, lib/server/paylinks.js).
 */
export async function createOrder({ userId = null, guest = false, customer, address, notes = '', lines, source = 'checkout', inquiryId = null, fixedDeliveryFee = null, discount = 0, by = 'System', paymentMethod = 'cod' }) {
  const settings = await getSettings();
  const merged = mergeLines(lines.filter((l) => l.qty > 0));
  if (!merged.length) fail(400, 'There are no items to order.');
  const dest = await resolveAddress(address);
  // keep county / borough with the address so orders can be filtered by them
  if (address && dest) {
    const g = geoOf({ ...address, county: address.county || dest.county, borough: address.borough || dest.borough });
    address = { ...address, ...(g.county ? { county: g.county } : {}), ...(g.borough ? { borough: g.borough } : {}) };
  }
  const { plan } = await routeOrder(prisma, { lines: merged, dest });
  const items = merged.map((l, i) => ({ ...l, vendorId: plan[i]?.vendorId || null, warehouseId: plan[i]?.warehouseId || null, distanceMi: plan[i]?.distanceMi ?? null, isHouse: plan[i]?.isHouse }));
  const ships = shipmentsOf(items);
  const subtotal = round2(items.reduce((s, i) => s + (i.price ?? 0) * i.qty, 0));
  const fee = fixedDeliveryFee != null ? round2(fixedDeliveryFee) : orderDeliveryFee(ships.map((s) => s.miles), subtotal, settings.delivery);
  const free = fixedDeliveryFee == null && fee === 0 && ships.length > 0 && Number(settings.delivery.freeOver) > 0;
  const total = round2(subtotal + fee - (Number(discount) || 0));
  const names = await whLabel(prisma, ships.map((s) => s.warehouseId));
  const city = address?.city ? `${address.city}${address.state ? `, ${address.state}` : ''}` : null;
  const quote = source === 'quote';
  const t = nowIso();

  const id = await prisma.$transaction(async (tx) => {
    const n = await nextNumber(tx, 'order', 10242);
    const oid = `JT-${n}`;
    await moveStockMany(tx, items.map((it) => ({ warehouseId: it.warehouseId, productId: it.productId, vendorId: it.vendorId, delta: -it.qty })), { reason: `Order ${oid}`, by });
    const order = await tx.order.create({
      data: {
        id: oid, userId, guest, customer, address, lat: dest?.lat, lng: dest?.lng, locationId: dest?.locationId,
        status: quote ? 'confirmed' : 'pending', paymentMethod: ['card', 'check'].includes(paymentMethod) ? paymentMethod : 'cod', source, inquiryId, notes,
        subtotal, deliveryFee: fee, deliveryMiles: ships.length ? Math.max(...ships.map((s) => s.miles || 0)) : null, discount: Number(discount) || 0, total,
        confirmedAt: quote ? new Date() : null,
        timeline: quote
          ? [{ status: 'confirmed', at: t, note: `Created from accepted quote ${inquiryId}` }]
          : [{ status: 'pending', at: t, note: guest ? 'Order request placed online (guest)' : 'Order request placed online — JOLOF will confirm prices & availability' }],
        events: [{ at: t, by: 'System', text: routingNote(items, names, city) + (dest && !dest.precise ? ' (distance approximate — address not geocoded)' : '') }],
        items: { create: items.map((i, k) => ({ sort: k, productId: i.productId || null, name: i.name, size: i.size || '', img: i.img || null, unit: i.unit || null, qty: i.qty, price: i.price ?? null, vendorId: i.vendorId, warehouseId: i.warehouseId, distanceMi: i.distanceMi })) },
        fulfilments: { create: ships.map((s) => ({ warehouseId: s.warehouseId, status: 'assigned', miles: s.miles, fee: free || fixedDeliveryFee != null ? 0 : deliveryFee(s.miles, settings.delivery) })) },
      },
      include: { items: true },
    });
    if (quote) await upsertInvoice(tx, order, settings);
    return oid;
  });
  return { id, deliveryFee: fee, total };
}

/** Undo an order whose card payment failed at checkout: stock goes back and the order is removed. */
export async function discardOrder(orderId, by = 'System') {
  const o = await fullOrder(prisma, orderId);
  if (!o) return;
  await prisma.$transaction(async (tx) => {
    await moveStockMany(tx, o.items.map((it) => ({ warehouseId: it.warehouseId, productId: it.productId, vendorId: it.vendorId, delta: it.qty })), { reason: `Order ${orderId} not placed — card payment failed`, by });
    await tx.order.delete({ where: { id: orderId } });
  });
}

/** Card charged at checkout / from a pay link → note it on the order and refresh its payment status. */
export async function markCardCharged(orderId, payment, text) {
  const o = await prisma.order.findUnique({ where: { id: orderId } });
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { events: [...o.events, { at: nowIso(), by: 'System', text: `${text || 'Card charged'} · ${payment.amount.toFixed(2)}${cardLabel(payment) ? ` · ${cardLabel(payment)}` : ''}` }] },
    });
    await refreshOrderPayment(tx, orderId);
  });
}

/** Delivery estimate for a cart (checkout preview) — no stock is reserved. */
export async function previewDelivery({ lines, address }) {
  const settings = await getSettings();
  const merged = mergeLines(lines.filter((l) => l.qty > 0));
  const dest = await resolveAddress(address);
  if (!dest) return { deliveryFee: null, miles: null, shipments: 0, unavailable: [], precise: false };
  const { plan } = await routeOrder(prisma, { lines: merged, dest });
  const items = merged.map((l, i) => ({ ...l, ...(plan[i] || {}) }));
  const ships = shipmentsOf(items);
  const subtotal = round2(items.reduce((s, i) => s + (i.price ?? 0) * i.qty, 0));
  return {
    deliveryFee: orderDeliveryFee(ships.map((s) => s.miles), subtotal, settings.delivery),
    miles: ships.length ? Math.max(...ships.map((s) => s.miles || 0)) : null,
    shipments: ships.length,
    unavailable: items.filter((i) => i.productId && !i.warehouseId).map((i) => i.productId),
    precise: dest.precise,
    freeOver: Number(settings.delivery.freeOver) || 0,
  };
}

/** Admin: set final prices / delivery / discount, confirm the order and issue the invoice. */
export async function confirmOrder(orderId, { prices = {}, deliveryFee: fee, discount, note = '' } = {}, actor) {
  const settings = await getSettings();

  // Card orders: settle the difference with Square BEFORE saving (refund if lower), so a failed
  // refund leaves the order untouched. A higher total becomes a separate balance payment request.
  const pre = await fullOrder(prisma, orderId);
  if (!pre) fail(404, 'Order not found.');
  if (pre.status === 'cancelled') fail(400, 'This order was cancelled.');
  let settle = null;
  if (pre.paymentMethod === 'card') {
    const { total } = finalTotals(pre, { prices, deliveryFee: fee, discount });
    settle = await settleCardTotal(pre, total, actor);
  }

  const result = await prisma.$transaction(async (tx) => {
    const o = await fullOrder(tx, orderId);
    if (!o) fail(404, 'Order not found.');
    if (o.status === 'cancelled') fail(400, 'This order was cancelled.');
    for (const it of o.items) {
      if (prices[it.id] !== undefined && prices[it.id] !== '' && prices[it.id] !== null) {
        const p = round2(prices[it.id]);
        if (p < 0) fail(400, 'Prices cannot be negative.');
        await tx.orderItem.update({ where: { id: it.id }, data: { price: p } });
        it.price = p;
      }
    }
    if (o.items.some((i) => i.price == null)) fail(400, 'Set a price for every line before confirming.');
    const subtotal = round2(o.items.reduce((s, i) => s + i.price * i.qty, 0));
    const dFee = fee !== undefined && fee !== '' && fee !== null ? round2(fee) : o.deliveryFee;
    const disc = discount !== undefined && discount !== '' && discount !== null ? round2(discount) : o.discount;
    const total = round2(subtotal + dFee - disc);
    const t = nowIso();
    const wasPending = o.status === 'pending';
    const request = settle ? await applyBalance(tx, { ...o, total }, settle.due, actor) : null;
    const payEvents = [...(settle?.events || []), ...(request ? [{ at: t, by: actor, text: `Balance payment requested · ${request.amount.toFixed(2)} (${request.id}) — link emailed to the customer` }] : [])];
    const confirmNote = settle?.refunded ? `Confirmed by JOLOF TRADING — $${settle.refunded.toFixed(2)} refunded to your card, invoice issued`
      : request ? `Confirmed by JOLOF TRADING — balance of $${request.amount.toFixed(2)} to pay, invoice issued`
        : 'Confirmed by JOLOF TRADING — invoice issued';
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        subtotal, deliveryFee: dFee, discount: disc, total,
        ...(wasPending ? { status: 'confirmed', confirmedAt: new Date(), timeline: [...o.timeline, { status: 'confirmed', at: t, note: note || confirmNote }] } : {}),
        events: [...o.events, { at: t, by: actor, text: wasPending ? `Confirmed · total ${total.toFixed(2)} · invoice issued` : `Prices updated · total ${total.toFixed(2)} · invoice re-issued` }, ...payEvents],
      },
      include: { items: { orderBy: { sort: 'asc' } } },
    });
    if (updated.paymentMethod === 'card') updated.payment = await refreshOrderPayment(tx, orderId);
    await upsertInvoice(tx, updated, settings);
    return { id: updated.id, wasPending, request, refunded: settle?.refunded || 0, changed: round2(o.total) !== total };
  });
  if (result.wasPending || result.changed) notify.orderConfirmed(result.id, { updated: !result.wasPending, refunded: result.refunded, requestId: result.request?.id || null, note });
  return result.id;
}

/** COD / check: once the order is delivered the driver has collected the cash or check → order + invoice marked paid. */
function codCollected(o, t, by) {
  const method = o.paymentMethod || 'cod';
  if (!['cod', 'check'].includes(method) || o.payment === 'paid') return null;
  return { payment: 'paid', event: { at: t, by, text: `${method === 'check' ? 'Check' : 'Cash'} collected on delivery · ${o.total.toFixed(2)}` } };
}

/** Admin moves the whole order (every supplier share moves with it). Cancelling restocks. */
export async function setOrderStatus(orderId, status, note, actor) {
  if (![...ORDER_FLOW, 'cancelled'].includes(status)) fail(400, 'Unknown status.');
  const o = await fullOrder(prisma, orderId);
  if (!o) fail(404, 'Order not found.');
  if (o.status === status) return;
  if (o.status === 'cancelled') fail(400, 'This order was cancelled.');
  if (o.status === 'pending' && status !== 'cancelled') {
    // moving past "pending" = confirming prices → invoice
    await confirmOrder(orderId, { note }, actor);
    if (status === 'confirmed') return;
    return setOrderStatus(orderId, status, note, actor);
  }
  // can't hand over goods while the customer still owes a card balance
  if (['shipped', 'delivered'].includes(status) && o.paymentMethod === 'card') {
    const open = await prisma.paymentRequest.findMany({ where: { orderId, kind: 'balance', status: 'open' } });
    if (open.length) fail(400, `Balance ${open.map((r) => r.id).join(', ')} (${'$' + openBalance(open).toFixed(2)}) is still unpaid. Wait for the customer to pay, or cancel the request in the Payment card to ship anyway.`);
  }
  // Card orders: release any hold / refund the charges before cancelling — if Square fails, nothing changes.
  let card = null;
  if (status === 'cancelled' && o.paymentMethod === 'card') card = await settleCancellation(orderId, actor);
  const t = nowIso();
  await prisma.$transaction(async (tx) => {
    if (status === 'cancelled') {
      for (const it of o.items) {
        if (it.productId && it.warehouseId) await moveStock(tx, { warehouseId: it.warehouseId, productId: it.productId, vendorId: it.vendorId, delta: it.qty, reason: `Order ${orderId} cancelled — restocked`, by: actor });
      }
      if (o.invoice) await tx.invoice.update({ where: { orderId }, data: { status: 'void' } });
    } else {
      const target = FUL_FLOW.indexOf(ORDER_TO_FUL[status]);
      for (const f of o.fulfilments) {
        if (FUL_FLOW.indexOf(f.status) < target) await tx.fulfilment.update({ where: { id: f.id }, data: { status: FUL_FLOW[target], at: new Date() } });
      }
    }
    const cash = status === 'delivered' ? codCollected(o, t, actor) : null;
    await tx.order.update({
      where: { id: orderId },
      data: {
        status, ...(cash ? { payment: 'paid' } : {}),
        timeline: [...o.timeline, { status, at: t, note: note || '' }],
        events: [...o.events, { at: t, by: actor, text: `Status → ${status}${note ? ` (${note})` : ''}` }, ...(cash ? [cash.event] : []), ...(card?.events || [])],
      },
    });
    if (cash) await tx.invoice.updateMany({ where: { orderId, status: { not: 'void' } }, data: { status: 'paid' } });
    if (status === 'cancelled') await tx.paymentRequest.updateMany({ where: { orderId, status: 'open' }, data: { status: 'cancelled', cancelledAt: new Date() } });
    if (o.paymentMethod === 'card') await refreshOrderPayment(tx, orderId);
  });
  notify.orderStatus(orderId, status, { note, refunded: card?.refunded || 0, by: actor });
}

export async function cancelByCustomer(orderId, user) {
  const o = await prisma.order.findUnique({ where: { id: orderId } });
  if (!o || o.userId !== user.id) fail(404, 'Order not found.');
  if (o.status !== 'pending') fail(400, 'Only orders awaiting confirmation can be cancelled online — please contact us.');
  await setOrderStatus(orderId, 'cancelled', 'Cancelled by customer', user.name);
}

/** Supplier (or admin) moves one warehouse's share forward. */
export async function setFulfilment(orderId, warehouseId, status, tracking, user, actor) {
  if (!FUL_FLOW.includes(status)) fail(400, 'Unknown status.');
  const o = await fullOrder(prisma, orderId);
  const wh = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  if (!o || !wh) fail(404, 'Order not found.');
  if (user.role !== 'admin' && wh.vendorId !== user.id) fail(403, 'Not your shipment.');
  if (o.status === 'cancelled') fail(400, 'This order was cancelled.');
  const f = o.fulfilments.find((x) => x.warehouseId === warehouseId);
  if (!f) fail(404, 'This shipment is no longer assigned to that warehouse.');
  const t = nowIso();
  let movedTo = null;
  await prisma.$transaction(async (tx) => {
    await tx.fulfilment.update({ where: { id: f.id }, data: { status, tracking: tracking ?? f.tracking, at: new Date() } });
    const fuls = o.fulfilments.map((x) => (x.id === f.id ? { ...x, status } : x));
    const unassigned = o.items.some((i) => i.productId && !i.warehouseId);
    const slowest = unassigned ? 0 : Math.min(...fuls.map((x) => FUL_FLOW.indexOf(x.status)));
    const derived = ORDER_FLOW[slowest];
    // the order only moves by itself once JOLOF has confirmed it (pending → confirmed is an admin step)
    const moved = o.status !== 'pending' && RANK[derived] > RANK[o.status];
    const trackings = [...new Set(fuls.map((x) => (x.id === f.id ? tracking ?? x.tracking : x.tracking)).filter(Boolean))].join(', ');
    const notes = { packed: 'Packed at our warehouse', shipped: 'Dispatched from our warehouse', delivered: 'Delivered' };
    const cash = moved && derived === 'delivered' ? codCollected(o, t, actor) : null;
    await tx.order.update({
      where: { id: orderId },
      data: {
        tracking: trackings || o.tracking,
        ...(moved ? { status: derived, timeline: [...o.timeline, { status: derived, at: t, note: notes[derived] || '' }] } : {}),
        ...(cash ? { payment: 'paid' } : {}),
        events: [...o.events, { at: t, by: actor, text: `${wh.name}: ${status}${tracking ? ` · tracking ${tracking}` : ''}` }, ...(cash ? [cash.event] : [])],
      },
    });
    if (cash) await tx.invoice.updateMany({ where: { orderId, status: { not: 'void' } }, data: { status: 'paid' } });
    movedTo = moved ? derived : null;
  });
  if (movedTo) notify.orderStatus(orderId, movedTo, { by: actor });
}

/** Re-route some lines after their warehouse dropped out; returns routed lines. */
async function reroute(tx, o, lines, exclude, actor, reason) {
  const dest = o.lat != null ? { lat: o.lat, lng: o.lng } : await resolveAddress(o.address);
  const { plan } = await routeOrder(prisma, { lines: lines.map((l) => ({ productId: l.productId, qty: l.qty })), dest, exclude });
  const out = [];
  for (let k = 0; k < lines.length; k++) {
    const l = lines[k];
    const p = plan[k];
    if (p && l.productId) await moveStock(tx, { warehouseId: p.warehouseId, productId: l.productId, vendorId: p.vendorId, delta: -l.qty, reason, by: actor });
    await tx.orderItem.update({ where: { id: l.id }, data: { vendorId: p?.vendorId || null, warehouseId: p?.warehouseId || null, distanceMi: p?.distanceMi ?? null } });
    out.push({ ...l, ...(p || { vendorId: null, warehouseId: null, distanceMi: null }) });
  }
  return out;
}

async function syncFulfilments(tx, orderId, keepStatusFor = {}) {
  const settings = await getSettings();
  const o = await fullOrder(tx, orderId);
  const ships = shipmentsOf(o.items);
  const want = new Set(ships.map((s) => s.warehouseId));
  for (const f of o.fulfilments) if (!want.has(f.warehouseId)) await tx.fulfilment.delete({ where: { id: f.id } });
  for (const s of ships) {
    const has = o.fulfilments.find((f) => f.warehouseId === s.warehouseId);
    if (!has) await tx.fulfilment.create({ data: { orderId, warehouseId: s.warehouseId, status: keepStatusFor[s.warehouseId] || 'assigned', miles: s.miles, fee: deliveryFee(s.miles, settings.delivery) } });
  }
  // prices not final yet → keep the delivery estimate in step with the new routing
  if (o.status === 'pending') {
    const fee = orderDeliveryFee(ships.map((s) => s.miles), o.subtotal, settings.delivery);
    await tx.order.update({ where: { id: orderId }, data: { deliveryFee: fee, deliveryMiles: ships.length ? Math.max(...ships.map((s) => s.miles || 0)) : null, total: round2(o.subtotal + fee - o.discount) } });
  }
}

/** Supplier can't fill it → stock goes back, lines go to the next option (JOLOF first, then nearest). */
export async function rejectFulfilment(orderId, warehouseId, reason, user, actor) {
  const o = await fullOrder(prisma, orderId);
  const wh = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  if (!o || !wh) fail(404, 'Order not found.');
  if (user.role !== 'admin' && wh.vendorId !== user.id) fail(403, 'Not your shipment.');
  if (o.status === 'cancelled') fail(400, 'This order was cancelled.');
  const lines = o.items.filter((i) => i.warehouseId === warehouseId);
  if (!lines.length) fail(404, 'Nothing assigned to this warehouse.');
  const declined = [...new Set([...(o.declinedBy || []), wh.vendorId])];
  let lost = 0;
  await prisma.$transaction(async (tx) => {
    for (const l of lines) if (l.productId) await moveStock(tx, { warehouseId, productId: l.productId, vendorId: l.vendorId, delta: l.qty, reason: `Order ${orderId} declined by ${actor}`, by: actor });
    const routed = await reroute(tx, o, lines, declined, actor, `Order ${orderId} re-routed`);
    lost = routed.filter((r) => !r.warehouseId).length;
    await syncFulfilments(tx, orderId);
    await tx.order.update({ where: { id: orderId }, data: { declinedBy: declined, events: [...o.events, { at: nowIso(), by: actor, text: `${wh.name} declined${reason ? ` (${reason})` : ''} — ${lost ? `${lost} line(s) need a supplier` : 're-routed to the next warehouse'}` }] } });
  }, { timeout: 20000 });
  return { lost };
}

/** Admin moves one shipment (or the unassigned lines) to another warehouse. */
export async function reassignGroup(orderId, fromKey, toWarehouseId, actor) {
  const o = await fullOrder(prisma, orderId);
  const to = await prisma.warehouse.findUnique({ where: { id: toWarehouseId } });
  if (!o || !to) fail(404, 'Order or warehouse not found.');
  if (fromKey === toWarehouseId) fail(400, 'Already assigned to that warehouse.');
  if (['cancelled', 'delivered'].includes(o.status)) fail(400, 'This order is closed.');
  const lines = o.items.filter((i) => (i.warehouseId || 'unassigned') === fromKey);
  if (!lines.length) fail(404, 'Nothing to move.');
  const dest = o.lat != null ? { lat: o.lat, lng: o.lng } : await resolveAddress(o.address);
  const miles = to.lat != null && dest ? (await milesTo(dest, [{ id: to.id, lat: to.lat, lng: to.lng }]))[to.id] : null;
  await prisma.$transaction(async (tx) => {
    for (const l of lines) {
      if (l.productId && l.warehouseId) await moveStock(tx, { warehouseId: l.warehouseId, productId: l.productId, vendorId: l.vendorId, delta: l.qty, reason: `Order ${orderId} reassigned`, by: actor });
      if (l.productId) {
        const ok = await tx.stockLevel.findUnique({ where: { warehouseId_productId: { warehouseId: to.id, productId: l.productId } } });
        if (!ok || ok.qty < l.qty) fail(400, `${to.name} doesn't hold enough of ${l.name}.`);
        await moveStock(tx, { warehouseId: to.id, productId: l.productId, vendorId: to.vendorId, delta: -l.qty, reason: `Order ${orderId} reassigned`, by: actor });
      }
      await tx.orderItem.update({ where: { id: l.id }, data: { vendorId: to.vendorId, warehouseId: to.id, distanceMi: miles } });
    }
    await syncFulfilments(tx, orderId);
    await tx.order.update({ where: { id: orderId }, data: { events: [...o.events, { at: nowIso(), by: actor, text: `${lines.length} line(s) assigned to ${to.name}${miles != null ? ` · ${miles} mi` : ''}` }] } });
  }, { timeout: 20000 });
}

export async function patchOrder(orderId, data, actor) {
  const o = await prisma.order.findUnique({ where: { id: orderId } });
  if (!o) fail(404, 'Order not found.');
  const patch = {};
  const ev = [];
  if (data.payment && o.paymentMethod === 'card') fail(400, 'Card payments are updated by Square — use the Payment card to refund or refresh.');
  if (data.payment && ['paid', 'unpaid'].includes(data.payment)) { patch.payment = data.payment; const m = o.paymentMethod || 'cod'; ev.push(['cod', 'check'].includes(m) ? `${m === 'check' ? 'Check' : 'Cash'} marked as ${data.payment === 'paid' ? 'collected' : 'not collected'}` : `Payment marked ${data.payment}`); }
  if (data.tracking !== undefined) { patch.tracking = String(data.tracking).trim().slice(0, 120); ev.push(`Tracking ${patch.tracking || 'cleared'}`); }
  if (data.driverId !== undefined) {
    const d = data.driverId ? await prisma.driver.findUnique({ where: { id: data.driverId } }) : null;
    if (data.driverId && !d) fail(404, 'Driver not found.');
    patch.driverId = d?.id || null;
    ev.push(d ? `Driver assigned: ${d.name}` : 'Driver unassigned');
  }
  if (!Object.keys(patch).length) return;
  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { ...patch, events: [...o.events, ...ev.map((text) => ({ at: nowIso(), by: actor, text }))] } });
    if (patch.payment) await tx.invoice.updateMany({ where: { orderId, status: { not: 'void' } }, data: { status: patch.payment } });
  });
}

/** Admin: refund part or all of an order's card payments (newest charge first). */
export async function refundOrder(orderId, amount, reason, actor) {
  const o = await prisma.order.findUnique({ where: { id: orderId } });
  if (!o) fail(404, 'Order not found.');
  if (o.paymentMethod !== 'card') fail(400, 'Only card orders can be refunded here.');
  const amt = await refundOrderCard(orderId, amount, reason);
  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { events: [...o.events, { at: nowIso(), by: actor, text: `Card refunded · ${amt.toFixed(2)}${reason ? ` (${reason})` : ''}` }] } });
    await refreshOrderPayment(tx, orderId);
  });
  notify.refunded(orderId, amt, reason);
}

/**
 * Pull the latest state of a Square payment and mirror it on the order.
 * Used by the webhook and the admin "Refresh from Square" button.
 */
export async function syncOrderPayment(providerId, actor = 'Square') {
  const before = await prisma.payment.findUnique({ where: { providerId } });
  if (!before) return null; // not one of ours (or a different store on the same Square account)
  const p = await syncPayment(providerId);
  const o = await prisma.order.findUnique({ where: { id: p.orderId } });
  if (!o) return p;
  const changed = p.status !== before.status || Math.abs(p.refunded - before.refunded) > 0.005;
  await prisma.$transaction(async (tx) => {
    if (changed) {
      const text = p.status === 'CANCELED' && before.status === 'APPROVED'
        ? 'Card hold was cancelled by Square (expired or cancelled in Square Dashboard) — the customer was not charged'
        : `Card payment updated from Square → ${p.status.toLowerCase()}${p.refunded ? ` · ${p.refunded.toFixed(2)} refunded` : ''}`;
      await tx.order.update({ where: { id: o.id }, data: { events: [...o.events, { at: nowIso(), by: actor, text }] } });
    }
    await refreshOrderPayment(tx, o.id);
  });
  return p;
}

/** Admin "Refresh from Square": re-read every card payment on the order. */
export async function syncAllOrderPayments(orderId, actor) {
  const pays = await prisma.payment.findMany({ where: { orderId, provider: 'square' } });
  if (!pays.length) fail(404, 'No card payment found for this order.');
  for (const p of pays) await syncOrderPayment(p.providerId, actor);
}
