export const money = (n) => (typeof n === 'number' && !Number.isNaN(n) ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—');
export const priced = (p) => typeof p?.price === 'number';
export const sizeLine = (p) => [p?.size, p?.pack].filter(Boolean).join(' · ');
export const catLine = (p) => (p.dept === p.cat ? p.dept : `${p.dept} · ${p.cat}`);

export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');
export const timeAgo = (iso) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24); if (d < 30) return `${d}d ago`;
  return fmtDate(iso);
};

export const ORDER_FLOW = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];
export const ORDER_STATUS = {
  pending: { label: 'Awaiting confirmation', cls: 'bg-gold-pale text-[#8a6417]' },
  confirmed: { label: 'Confirmed', cls: 'bg-[#E6EEF8] text-navy-600' },
  packed: { label: 'Packed', cls: 'bg-[#EEE9F8] text-[#5B3FA0]' },
  shipped: { label: 'Shipped', cls: 'bg-[#E3F1F4] text-[#1D6474]' },
  delivered: { label: 'Delivered', cls: 'bg-[#E3F2EA] text-emerald' },
  cancelled: { label: 'Cancelled', cls: 'bg-[#F8E7E3] text-[#B4432F]' },
};
export const PAYMENT_STATUS = {
  unpaid: { label: 'Unpaid', cls: 'bg-[#F8E7E3] text-[#B4432F]' },
  paid: { label: 'Paid', cls: 'bg-[#E3F2EA] text-emerald' },
};
// Cash on delivery is the only payment method (no card / online payments). Older orders may still say 'invoice'.
export const PAYMENT_METHODS = { cod: 'Cash on delivery', invoice: 'Invoice · bank transfer', bank_transfer: 'Bank transfer' };
export const COD_NOTE = 'Cash on delivery — please have the full amount ready in cash for our driver when your order arrives.';
/** Payment pill for an order: COD orders read "Cash on delivery" until the driver collects the cash. */
export function paymentMeta(order) {
  const cod = (order?.paymentMethod || 'cod') === 'cod';
  if (order?.payment === 'paid') return cod ? { label: 'Cash collected', cls: PAYMENT_STATUS.paid.cls } : PAYMENT_STATUS.paid;
  if (order?.status === 'cancelled') return { label: 'No payment', cls: 'bg-sand text-charcoal/60' };
  return cod ? { label: 'Cash on delivery', cls: 'bg-gold-pale text-[#8a6417]' } : PAYMENT_STATUS.unpaid;
}
export const INVOICE_STATUS = {
  unpaid: { label: 'Unpaid', cls: 'bg-[#F8E7E3] text-[#B4432F]' },
  paid: { label: 'Paid', cls: 'bg-[#E3F2EA] text-emerald' },
  void: { label: 'Void', cls: 'bg-sand text-charcoal/60' },
};
export const DRIVER_STATUS = {
  active: { label: 'Active', cls: 'bg-[#E3F2EA] text-emerald' },
  off_duty: { label: 'Off duty', cls: 'bg-gold-pale text-[#8a6417]' },
  inactive: { label: 'Inactive', cls: 'bg-sand text-charcoal/60' },
};
export const REQUEST_STATUS = {
  pending: { label: 'Awaiting review', cls: 'bg-gold-pale text-[#8a6417]' },
  approved: { label: 'Approved', cls: 'bg-[#E3F2EA] text-emerald' },
  rejected: { label: 'Rejected', cls: 'bg-[#F8E7E3] text-[#B4432F]' },
};

export const INQUIRY_STATUS = {
  new: { label: 'New', cls: 'bg-gold-pale text-[#8a6417]' },
  in_review: { label: 'In review', cls: 'bg-[#E6EEF8] text-navy-600' },
  quoted: { label: 'Quote sent', cls: 'bg-[#EEE9F8] text-[#5B3FA0]' },
  accepted: { label: 'Accepted', cls: 'bg-[#E3F2EA] text-emerald' },
  declined: { label: 'Declined', cls: 'bg-[#F8E7E3] text-[#B4432F]' },
  closed: { label: 'Closed', cls: 'bg-sand text-charcoal/60' },
};
export const INQUIRY_TYPE = {
  bulk: 'Bulk pricing',
  product: 'Product enquiry',
  cart: 'Cart quote',
  commodity: 'Commodity quote',
  contact: 'Contact',
};

export const USER_STATUS = {
  active: { label: 'Active', cls: 'bg-[#E3F2EA] text-emerald' },
  pending: { label: 'Pending approval', cls: 'bg-gold-pale text-[#8a6417]' },
  suspended: { label: 'Suspended', cls: 'bg-[#F8E7E3] text-[#B4432F]' },
};
export const CATEGORY_STATUS = {
  active: { label: 'Active', cls: 'bg-[#E3F2EA] text-emerald' },
  coming_soon: { label: 'Coming soon', cls: 'bg-gold-pale text-[#8a6417]' },
  hidden: { label: 'Hidden', cls: 'bg-sand text-charcoal/60' },
};

export const stockState = (p) => (p.price === null && p.stock > 0 ? (p.stock <= p.lowStock ? 'low' : 'ok') : p.stock <= 0 ? 'out' : p.stock <= p.lowStock ? 'low' : 'ok');
export const STOCK_STATE = {
  ok: { label: 'In stock', cls: 'bg-[#E3F2EA] text-emerald' },
  low: { label: 'Low stock', cls: 'bg-gold-pale text-[#8a6417]' },
  out: { label: 'Out of stock', cls: 'bg-[#F8E7E3] text-[#B4432F]' },
};

/** "1 case", "3 cases", "20 MT" */
export const qtyUnit = (qty, unit) => {
  if (!unit) return String(qty);
  const u = Number(qty) === 1 && /s$/i.test(unit) && unit.length > 2 ? unit.slice(0, -1) : unit;
  return `${qty} ${u}`;
};
