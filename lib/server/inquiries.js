// Inquiries → admin quote (final pricing + delivery) → private pay link emailed to the customer
// (also shown in their account) → they pay by card → confirmed order + invoice (lib/server/paylinks.js).
import { prisma } from './db';
import { fail, round2, str, int, EMAIL } from './http';
import { nextNumber } from './settings';
import { createRequest, cancelOpen } from './payments';
import { notify } from './notify';

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
  notify.inquiryReceived(id);
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
  const total = round2(lines.reduce((t, l) => t + l.qty * l.unitPrice, 0) + quote.shipping - quote.discount);
  if (!(total > 0)) fail(400, 'The quote total must be more than $0.');
  const req = await prisma.$transaction(async (tx) => {
    // a revised quote replaces the old link
    await cancelOpen(tx, { inquiryId: id, kind: 'quote' });
    const r = await createRequest(tx, { kind: 'quote', inquiryId: id, amount: total, reason: `Quote ${id}`, name: inq.name, email: inq.email, by: actor });
    await tx.inquiry.update({
      where: { id },
      data: { status: 'quoted', quote, ...(q.address ? { address: q.address } : {}), notes: [...inq.notes, { by: actor, text: `Quote sent · ${lines.length} line(s) · $${total.toFixed(2)} · payment link ${r.id} emailed`, at: nowIso() }] },
    });
    return r;
  });
  notify.quoteSent(id, req.id);
}

export async function declineQuote(id, user) {
  const inq = await prisma.inquiry.findUnique({ where: { id } });
  if (!inq || (inq.userId !== user.id && inq.email.toLowerCase() !== user.email.toLowerCase())) fail(404, 'Quote not found.');
  if (inq.status !== 'quoted') fail(400, 'This quote can no longer be declined.');
  await prisma.$transaction(async (tx) => {
    await tx.inquiry.update({ where: { id }, data: { status: 'declined', notes: [...inq.notes, { by: user.name, text: 'Declined by the customer', at: nowIso() }] } });
    await cancelOpen(tx, { inquiryId: id, kind: 'quote' });
  });
  notify.quoteDeclined(id);
}

export async function patchInquiry(id, { status, note }, actor) {
  const inq = await prisma.inquiry.findUnique({ where: { id } });
  if (!inq) fail(404, 'Inquiry not found.');
  const data = {};
  if (status && ['new', 'in_review', 'quoted', 'accepted', 'declined', 'closed'].includes(status)) data.status = status;
  if (note && str(note)) data.notes = [...inq.notes, { by: actor, text: str(note, 2000), at: nowIso() }];
  await prisma.$transaction(async (tx) => {
    await tx.inquiry.update({ where: { id }, data });
    // closing / reopening an inquiry kills the old payment link (a new quote issues a new one)
    if (data.status && data.status !== 'quoted') await cancelOpen(tx, { inquiryId: id, kind: 'quote' });
  });
}

export const qtyOf = (n) => int(n, 1);
