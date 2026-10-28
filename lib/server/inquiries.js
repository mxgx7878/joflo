// Inquiries → admin quote (final pricing + delivery) → customer accepts → confirmed order + invoice.
import { prisma } from './db';
import { fail, round2, str, int, EMAIL } from './http';
import { nextNumber } from './settings';
import { createOrder } from './orders';

const nowIso = () => new Date().toISOString();
const TYPES = ['bulk', 'product', 'cart', 'commodity', 'contact'];

export async function submitInquiry(d, user) {
  const email = str(d.email, 160).toLowerCase() || user?.email;
  const name = str(d.name, 120) || user?.name;
  if (!name || !EMAIL.test(email || '')) fail(400, 'Please enter your name and a valid email.');
  const items = (Array.isArray(d.items) ? d.items : []).slice(0, 60).map((i) => ({
    productId: i.productId ? str(i.productId, 40) : undefined, commodityId: i.commodityId ? str(i.commodityId, 40) : undefined,
    name: str(i.name, 200), qty: Math.max(1, Number(i.qty) || 1), unit: str(i.unit, 20) || 'units',
  })).filter((i) => i.name);
  const customer = user?.role === 'customer' ? user : null;
  const addr = d.address || customer?.addresses?.find((a) => a.isDefault) || customer?.addresses?.[0] || null;
  const id = await prisma.$transaction(async (tx) => {
    const n = await nextNumber(tx, 'inquiry', 2059);
    const iid = `INQ-${n}`;
    await tx.inquiry.create({
      data: {
        id: iid, type: TYPES.includes(d.type) ? d.type : 'bulk', userId: customer?.id || null, name, email,
        company: str(d.company, 160) || customer?.company || '', phone: str(d.phone, 40) || customer?.phone || '', dept: str(d.dept, 80), message: str(d.message, 4000),
        items, trade: d.trade && typeof d.trade === 'object' ? d.trade : undefined,
        address: addr ? { label: addr.label || '', line1: addr.line1, city: addr.city, state: addr.state, postcode: addr.postcode, country: addr.country || 'United States' } : undefined,
      },
    });
    return iid;
  });
  return id;
}

export async function sendQuote(id, q, actor) {
  const inq = await prisma.inquiry.findUnique({ where: { id } });
  if (!inq) fail(404, 'Inquiry not found.');
  const lines = (q.lines || []).map((l) => ({
    productId: l.productId || null, commodityId: l.commodityId || null, name: str(l.name, 200), size: str(l.size, 120), unit: str(l.unit, 20) || null,
    qty: Math.max(1, Number(l.qty) || 1), unitPrice: round2(l.unitPrice),
  })).filter((l) => l.name);
  if (!lines.length) fail(400, 'Add at least one priced line.');
  if (lines.some((l) => !(l.unitPrice > 0))) fail(400, 'Every line needs a unit price.');
  const quote = {
    lines, shipping: round2(q.shipping), deliveryMiles: q.deliveryMiles ?? null, discount: round2(q.discount),
    validUntil: str(q.validUntil, 20), note: str(q.note, 2000), sentAt: nowIso(), sentBy: actor,
  };
  await prisma.inquiry.update({
    where: { id },
    data: { status: 'quoted', quote, ...(q.address ? { address: q.address } : {}), notes: [...inq.notes, { by: actor, text: `Quote sent · ${lines.length} line(s)`, at: nowIso() }] },
  });
}

export async function acceptQuote(id, user, { addressId, address } = {}) {
  const inq = await prisma.inquiry.findUnique({ where: { id } });
  if (!inq || (inq.userId !== user.id && inq.email.toLowerCase() !== user.email.toLowerCase())) fail(404, 'Quote not found.');
  if (inq.status !== 'quoted' || !inq.quote) fail(400, 'This quote can no longer be accepted.');
  if (inq.quote.validUntil && new Date(`${inq.quote.validUntil}T23:59:59`) < new Date()) fail(400, 'This quote has expired — ask us for an updated one.');
  const addr = address || user.addresses.find((a) => a.id === addressId) || user.addresses.find((a) => a.isDefault) || user.addresses[0] || inq.address;
  if (!addr) fail(400, 'Add a delivery address first.');
  const products = await prisma.product.findMany({ where: { id: { in: inq.quote.lines.map((l) => l.productId).filter(Boolean) } }, select: { id: true, img: true, size: true, pack: true } });
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  const { id: orderId } = await createOrder({
    userId: user.id, customer: { name: user.name, email: user.email, phone: user.phone, company: user.company },
    address: { label: addr.label || 'Delivery', line1: addr.line1, city: addr.city, state: addr.state, postcode: addr.postcode, country: addr.country || 'United States' },
    lines: inq.quote.lines.map((l) => ({ productId: l.productId || null, name: l.name, size: l.size || [byId[l.productId]?.size, byId[l.productId]?.pack].filter(Boolean).join(' · '), img: byId[l.productId]?.img || null, unit: l.unit, qty: l.qty, price: l.unitPrice })),
    source: 'quote', inquiryId: inq.id, fixedDeliveryFee: inq.quote.shipping || 0, discount: inq.quote.discount || 0, by: user.name,
  });
  await prisma.inquiry.update({ where: { id }, data: { status: 'accepted', orderId, userId: inq.userId || user.id } });
  return orderId;
}

export async function declineQuote(id, user) {
  const inq = await prisma.inquiry.findUnique({ where: { id } });
  if (!inq || (inq.userId !== user.id && inq.email.toLowerCase() !== user.email.toLowerCase())) fail(404, 'Quote not found.');
  if (inq.status !== 'quoted') fail(400, 'This quote can no longer be declined.');
  await prisma.inquiry.update({ where: { id }, data: { status: 'declined' } });
}

export async function patchInquiry(id, { status, note }, actor) {
  const inq = await prisma.inquiry.findUnique({ where: { id } });
  if (!inq) fail(404, 'Inquiry not found.');
  const data = {};
  if (status && ['new', 'in_review', 'quoted', 'accepted', 'declined', 'closed'].includes(status)) data.status = status;
  if (note && str(note)) data.notes = [...inq.notes, { by: actor, text: str(note, 2000), at: nowIso() }];
  await prisma.inquiry.update({ where: { id }, data });
}

export const qtyOf = (n) => int(n, 1);
