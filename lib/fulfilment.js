// Order routing: which supplier warehouse ships which line.
// Pure functions — used by the store, the seed data and the UI previews. When a backend is
// connected this logic moves server-side unchanged.
import { getLocation, distanceKm } from './locations';

export const HOUSE_VENDOR = 'v-jolof'; // JOLOF TRADING's own warehouse
export const UNASSIGNED = 'unassigned';

/** Supplier-side status of one warehouse's share of an order. Index lines up with ORDER_FLOW. */
export const FUL_FLOW = ['assigned', 'accepted', 'packed', 'shipped', 'delivered'];
export const FUL_STATUS = {
  assigned: { label: 'New — awaiting supplier', cls: 'bg-gold-pale text-[#8a6417]' },
  accepted: { label: 'Accepted', cls: 'bg-[#E6EEF8] text-navy-600' },
  packed: { label: 'Packed', cls: 'bg-[#EEE9F8] text-[#5B3FA0]' },
  shipped: { label: 'Shipped', cls: 'bg-[#E3F1F4] text-[#1D6474]' },
  delivered: { label: 'Delivered', cls: 'bg-[#E3F2EA] text-emerald' },
  cancelled: { label: 'Cancelled', cls: 'bg-[#F8E7E3] text-[#B4432F]' },
  unassigned: { label: 'Needs a supplier', cls: 'bg-[#F8E7E3] text-[#B4432F]' },
};
export const FUL_SHORT = { assigned: 'New', accepted: 'Accepted', packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', unassigned: 'Unassigned' };
export const ORDER_TO_FUL = { pending: 'assigned', confirmed: 'accepted', packed: 'packed', shipped: 'shipped', delivered: 'delivered', cancelled: 'cancelled' };

export const activeVendorIds = (users) => new Set(users.filter((u) => u.role === 'vendor' && u.status === 'active').map((u) => u.id));

const offerKey = (vendorId, productId) => `${vendorId}|${productId}`;
export const indexOffers = (offers) => new Map(offers.map((o) => [offerKey(o.vendorId, o.productId), o]));

/** Units of a product held in one warehouse (0 if the offer is paused or missing). */
export function stockAt(index, warehouse, productId) {
  const o = index.get(offerKey(warehouse.vendorId, productId));
  return o && o.status !== 'paused' ? Number(o.stock?.[warehouse.id]) || 0 : 0;
}

/** Warehouses that can receive orders, nearest first, with distance from `location`. */
export function rankWarehouses({ location, warehouses, users, exclude = [] }) {
  const ok = activeVendorIds(users);
  return warehouses
    .filter((w) => w.active !== false && ok.has(w.vendorId) && !exclude.includes(w.vendorId))
    .map((w) => ({ w, km: location ? distanceKm(location, getLocation(w.locationId)) : 0 }))
    .sort((a, b) => a.km - b.km || (a.w.vendorId === HOUSE_VENDOR ? -1 : 1));
}

/**
 * Decide where each line ships from.
 * Rule 1 — the nearest warehouse that can fill the WHOLE order (one parcel).
 * Rule 2 — otherwise split: each line goes to the nearest warehouse holding enough of it.
 * Lines nobody can fill come back null (admin assigns them by hand).
 * Lines without a catalogue product (e.g. commodity quotes) ship direct from JOLOF.
 */
export function planFulfilment({ lines, location, warehouses, offers, users, exclude = [] }) {
  const index = indexOffers(offers);
  const ranked = rankWarehouses({ location, warehouses, users, exclude });
  const pick = ({ w, km }) => ({ vendorId: w.vendorId, warehouseId: w.id, distanceKm: km });
  const house = ranked.find((r) => r.w.vendorId === HOUSE_VENDOR) || null;
  const stockLines = lines.filter((l) => l.productId);

  const whole = stockLines.length ? ranked.find((r) => stockLines.every((l) => stockAt(index, r.w, l.productId) >= l.qty)) : null;
  return lines.map((l) => {
    if (!l.productId) return house ? pick(house) : null;
    if (whole) return pick(whole);
    const hit = ranked.find((r) => stockAt(index, r.w, l.productId) >= l.qty);
    return hit ? pick(hit) : null;
  });
}

/** Apply stock deltas: [{ vendorId, productId, warehouseId, delta }] → new offers array. */
export function applyStock(offers, changes) {
  if (!changes.length) return offers;
  const next = offers.map((o) => ({ ...o, stock: { ...o.stock } }));
  const index = indexOffers(next);
  changes.forEach((c) => {
    if (!c.productId || !c.warehouseId) return;
    const o = index.get(offerKey(c.vendorId, c.productId));
    if (!o) return;
    o.stock[c.warehouseId] = Math.max(0, (Number(o.stock[c.warehouseId]) || 0) + c.delta);
  });
  return next;
}

/** product.stock = everything active suppliers hold across their warehouses. */
export function recalcProductStock(products, offers, users) {
  const ok = activeVendorIds(users);
  const totals = {};
  offers.forEach((o) => {
    if (o.status === 'paused' || !ok.has(o.vendorId)) return;
    totals[o.productId] = (totals[o.productId] || 0) + Object.values(o.stock || {}).reduce((s, n) => s + (Number(n) || 0), 0);
  });
  return products.map((p) => ((totals[p.id] || 0) === p.stock ? p : { ...p, stock: totals[p.id] || 0 }));
}

/** Split an order into one group per shipping warehouse (plus an "unassigned" group if any). */
export function fulfilmentGroups(order) {
  const map = new Map();
  (order.items || []).forEach((it, idx) => {
    const key = it.warehouseId || UNASSIGNED;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({ ...it, idx });
  });
  return [...map.entries()].map(([key, items]) => {
    const f = order.fulfilments?.[key] || {};
    return {
      key,
      warehouseId: key === UNASSIGNED ? null : key,
      vendorId: key === UNASSIGNED ? null : items[0].vendorId,
      distanceKm: items[0].distanceKm ?? null,
      items,
      status: key === UNASSIGNED ? UNASSIGNED : order.status === 'cancelled' ? 'cancelled' : f.status || 'assigned',
      tracking: f.tracking || '',
      updatedAt: f.at || null,
    };
  });
}

/** Order status implied by its supplier groups (the slowest group wins). */
export function statusFromGroups(groups) {
  const ranks = groups.map((g) => (g.status === UNASSIGNED ? 0 : Math.max(0, FUL_FLOW.indexOf(g.status))));
  return ['pending', 'confirmed', 'packed', 'shipped', 'delivered'][ranks.length ? Math.min(...ranks) : 0];
}

/** Value of a supplier's share at their own supply price (falls back to retail price). */
export function supplyValue(items, offers) {
  const index = indexOffers(offers);
  return Math.round(items.reduce((s, it) => {
    const o = it.productId ? index.get(offerKey(it.vendorId, it.productId)) : null;
    const unit = typeof o?.cost === 'number' ? o.cost : it.price || 0;
    return s + unit * it.qty;
  }, 0) * 100) / 100;
}
