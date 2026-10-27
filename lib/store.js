'use client';
// Single demo store for the whole app (storefront + customer account + admin).
// Persisted to localStorage so the flow survives reloads, and synced across tabs so you
// can keep the admin open in one tab and the storefront in another.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import { SEED_COMMODITIES, BASE_CATEGORIES } from './catalogue';
import { SEED_USERS, SEED_ORDERS, SEED_INQUIRIES, SEED_STOCK_LOG, SEED_SUBSCRIBERS, SEED_WAREHOUSES, SEED_OFFERS, SEED_PRODUCTS_STOCKED } from './seed';
import { getLocation, locationFromAddress, distanceKm } from './locations';
import {
  planFulfilment, applyStock, recalcProductStock, fulfilmentGroups, statusFromGroups, indexOffers,
  HOUSE_VENDOR, UNASSIGNED, FUL_FLOW, ORDER_TO_FUL,
} from './fulfilment';

const STORE_KEY = 'jolof_demo_v1';
const round = (n) => Math.round(n * 100) / 100;
const now = () => new Date().toISOString();
const rid = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const SHIPPING_FLAT = 18;
export const FREE_SHIPPING_FROM = 250;
export const shippingFor = (subtotal) => (subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FLAT);
export const quoteTotal = (q) => round((q?.lines || []).reduce((s, l) => s + l.qty * l.unitPrice, 0) + (Number(q?.shipping) || 0));

const ORDER_RANK = { pending: 0, confirmed: 1, packed: 2, shipped: 3, delivered: 4 };
const actorName = (u) => (u ? (u.role === 'vendor' ? u.company : u.name) : 'System');

/** Recompute storefront stock totals whenever supplier stock or supplier status changes. */
const stockPatch = (s, offers, users = s.users) => ({ offers, products: recalcProductStock(s.products, offers, users) });

/** Attach routing (vendor + warehouse + distance) to order lines and build the stock moves. */
function routeLines(s, items, location, exclude = []) {
  const plan = planFulfilment({ lines: items, location, warehouses: s.warehouses, offers: s.offers, users: s.users, exclude });
  const routed = items.map((it, i) => ({ ...it, vendorId: plan[i]?.vendorId || null, warehouseId: plan[i]?.warehouseId || null, distanceKm: plan[i]?.distanceKm ?? null }));
  const moves = routed.filter((it) => it.productId && it.warehouseId).map((it) => ({ vendorId: it.vendorId, productId: it.productId, warehouseId: it.warehouseId, delta: -it.qty }));
  const fulfilments = Object.fromEntries([...new Set(routed.map((i) => i.warehouseId).filter(Boolean))].map((w) => [w, { status: 'assigned', tracking: '', at: now() }]));
  return { items: routed, moves, fulfilments };
}
const logMoves = (moves, reason, by = 'System') => moves.map((m) => ({ id: rid('sl'), productId: m.productId, warehouseId: m.warehouseId, vendorId: m.vendorId, change: m.delta, reason, at: now(), by }));
const whCity = (s, whId) => getLocation(s.warehouses.find((w) => w.id === whId)?.locationId)?.city || 'supplier';

const seedState = () => ({
  products: SEED_PRODUCTS_STOCKED,
  warehouses: SEED_WAREHOUSES,
  offers: SEED_OFFERS, // what each supplier carries: { vendorId, productId, cost, stock: { warehouseId: qty }, status }
  deliveryLocation: null, // { locationId, suburb, postcode } — asked on first visit, used to route orders
  categories: BASE_CATEGORIES,
  commodities: SEED_COMMODITIES,
  users: SEED_USERS,
  orders: SEED_ORDERS,
  inquiries: SEED_INQUIRIES,
  stockLog: SEED_STOCK_LOG,
  subscribers: SEED_SUBSCRIBERS,
  cart: {}, // { productId: qty }
  wish: [], // [productId]
  sessionUserId: null,
  counters: { order: 10242, inquiry: 2059 },
});

export const useStore = create(
  persist(
    (set, get) => ({
      ...seedState(),

      /* ---------------- Auth ---------------- */
      currentUser: () => get().users.find((u) => u.id === get().sessionUserId) || null,
      login: (email, password) => {
        const u = get().users.find((x) => x.email.toLowerCase() === String(email).trim().toLowerCase());
        if (!u || u.password !== password) return { ok: false, error: 'Email or password is incorrect.' };
        if (u.status === 'suspended') return { ok: false, error: 'This account has been suspended. Please contact JOLOF TRADING.' };
        set({ sessionUserId: u.id });
        return { ok: true, user: u };
      },
      logout: () => set({ sessionUserId: null }),
      register: (data) => {
        const email = data.email.trim().toLowerCase();
        if (get().users.some((u) => u.email.toLowerCase() === email)) return { ok: false, error: 'An account with this email already exists.' };
        const supplier = data.type === 'supplier';
        const user = {
          id: rid(supplier ? 'v-' : 'u-'), role: supplier ? 'vendor' : 'customer', type: data.type, name: data.name.trim(), email, password: data.password,
          phone: data.phone || '', company: data.company || '', abn: data.abn || '', businessType: data.businessType || '',
          status: data.type === 'individual' ? 'active' : 'pending', createdAt: now(),
          addresses: data.line1 && !supplier ? [{ id: 'a1', label: data.type === 'retailer' ? 'Store' : 'Home', line1: data.line1, city: data.city, state: data.state, postcode: data.postcode, country: data.country || 'Australia', isDefault: true }] : [],
        };
        const wh = supplier && data.line1 ? [{
          id: rid('wh-'), vendorId: user.id, name: `${user.company} — ${getLocation(data.locationId)?.city || data.city}`, line1: data.line1,
          suburb: data.city, postcode: data.postcode, locationId: data.locationId || locationFromAddress(data)?.id || 'melbourne', active: true,
        }] : [];
        set((s) => ({
          users: [...s.users, user], sessionUserId: user.id, warehouses: [...s.warehouses, ...wh],
          // a guest who checked out with this email now sees those orders in their account
          orders: supplier ? s.orders : s.orders.map((o) => (o.guest && !o.userId && o.customer?.email?.toLowerCase() === email ? { ...o, userId: user.id } : o)),
        }));
        return { ok: true, user };
      },
      updateProfile: (patch) => set((s) => ({ users: s.users.map((u) => (u.id === s.sessionUserId ? { ...u, ...patch } : u)) })),
      saveAddress: (address) => set((s) => ({
        users: s.users.map((u) => {
          if (u.id !== s.sessionUserId) return u;
          let list = address.id ? u.addresses.map((a) => (a.id === address.id ? { ...a, ...address } : a)) : [...u.addresses, { ...address, id: rid('a') }];
          if (address.isDefault || list.length === 1) { const target = address.id || list[list.length - 1].id; list = list.map((a) => ({ ...a, isDefault: a.id === target })); }
          return { ...u, addresses: list };
        }),
      })),
      removeAddress: (id) => set((s) => ({ users: s.users.map((u) => (u.id === s.sessionUserId ? { ...u, addresses: u.addresses.filter((a) => a.id !== id) } : u)) })),

      /* ---------------- Cart & wishlist ---------------- */
      addToCart: (id, qty = 1) => {
        const p = get().products.find((x) => x.id === id);
        if (!p || typeof p.price !== 'number') return false;
        set((s) => ({ cart: { ...s.cart, [id]: Math.min(999, (s.cart[id] || 0) + qty) } }));
        return true;
      },
      setQty: (id, qty) => set((s) => { const c = { ...s.cart }; if (qty <= 0) delete c[id]; else c[id] = Math.min(999, qty); return { cart: c }; }),
      removeFromCart: (id) => set((s) => { const c = { ...s.cart }; delete c[id]; return { cart: c }; }),
      clearCart: () => set({ cart: {} }),
      toggleWish: (id) => { const on = get().wish.includes(id); set((s) => ({ wish: on ? s.wish.filter((x) => x !== id) : [...s.wish, id] })); return !on; },

      /* ---------------- Delivery location ---------------- */
      setDeliveryLocation: (loc) => set({ deliveryLocation: loc ? { locationId: loc.locationId, suburb: loc.suburb || '', postcode: loc.postcode || '' } : null }),
      /** Where an order to `address` would ship from — used for the checkout preview. */
      previewRouting: (address) => {
        const s = get();
        const location = getLocation(s.deliveryLocation?.locationId) || locationFromAddress(address);
        const items = Object.entries(s.cart).map(([productId, qty]) => ({ productId, qty }));
        return { location, ...routeLines(s, items, location) };
      },

      /* ---------------- Orders ---------------- */
      // guest = { name, email, phone, company } when checking out without an account
      placeOrder: ({ address, paymentMethod, notes, guest }) => {
        const s = get();
        const u = s.currentUser();
        if (u && u.role !== 'customer') return { ok: false, error: 'Sign in with a customer account to place an order.' };
        if (!u && !(guest?.name && guest?.email)) return { ok: false, error: 'Please enter your name and email.' };
        const lines = Object.entries(s.cart).map(([id, qty]) => {
          const p = s.products.find((x) => x.id === id);
          return p && typeof p.price === 'number' ? { productId: id, name: p.name, size: [p.size, p.pack].filter(Boolean).join(' · '), img: p.img, qty, price: p.price } : null;
        }).filter(Boolean);
        if (!lines.length) return { ok: false, error: 'Your cart is empty.' };
        const location = getLocation(s.deliveryLocation?.locationId) || locationFromAddress(address);
        const { items, moves, fulfilments } = routeLines(s, lines, location);
        const subtotal = round(items.reduce((a, i) => a + i.price * i.qty, 0));
        const shipping = shippingFor(subtotal);
        const id = `JT-${s.counters.order}`;
        const customer = u ? { name: u.name, email: u.email, phone: u.phone, company: u.company } : { name: guest.name.trim(), email: guest.email.trim().toLowerCase(), phone: guest.phone || '', company: guest.company || '' };
        const unrouted = items.filter((i) => !i.warehouseId).length;
        const order = {
          id, userId: u?.id || null, guest: !u, customer, items, subtotal, shipping,
          total: round(subtotal + shipping), status: 'pending', payment: 'unpaid', paymentMethod, address, location, fulfilments, source: 'checkout', notes: notes || '',
          tracking: '', timeline: [{ status: 'pending', at: now(), note: u ? 'Order placed online' : 'Order placed online (guest checkout)' }], createdAt: now(),
          events: [{ at: now(), by: 'System', text: unrouted ? `Routed by location (${location?.city || 'unknown'}). ${unrouted} line(s) need a supplier.` : `Routed to the nearest supplier warehouse for ${location?.city || 'the delivery address'}.` }],
        };
        set((st) => ({
          orders: [order, ...st.orders],
          cart: {},
          counters: { ...st.counters, order: st.counters.order + 1 },
          ...stockPatch(st, applyStock(st.offers, moves)),
          stockLog: [...logMoves(moves, `Order ${id}`), ...st.stockLog],
        }));
        return { ok: true, id };
      },
      cancelOrder: (id) => get().updateOrderStatus(id, 'cancelled', 'Cancelled by customer'),

      /* ---------------- Inquiries / quotes ---------------- */
      submitInquiry: (data) => {
        const s = get();
        const u = s.currentUser();
        const id = `INQ-${s.counters.inquiry}`;
        const inq = {
          id, type: data.type || 'bulk', userId: u?.role === 'customer' ? u.id : null,
          name: data.name, company: data.company || '', email: data.email, phone: data.phone || '', dept: data.dept || '',
          message: data.message || '', items: data.items || [], trade: data.trade || null,
          status: 'new', createdAt: now(), notes: [], quote: null, orderId: null,
        };
        set((st) => ({ inquiries: [inq, ...st.inquiries], counters: { ...st.counters, inquiry: st.counters.inquiry + 1 } }));
        return { ok: true, id };
      },
      acceptQuote: (inqId, { address, paymentMethod } = {}) => {
        const s = get();
        const inq = s.inquiries.find((i) => i.id === inqId);
        const u = s.currentUser();
        if (!inq?.quote || inq.status !== 'quoted' || !u) return { ok: false, error: 'This quote can no longer be accepted.' };
        const id = `JT-${s.counters.order}`;
        const lines = inq.quote.lines.map((l) => {
          const p = s.products.find((x) => x.id === l.productId);
          return { productId: l.productId || null, name: l.name, size: l.size || (p ? [p.size, p.pack].filter(Boolean).join(' · ') : ''), img: p?.img || null, qty: l.qty, price: l.unitPrice, unit: l.unit };
        });
        const addr = address || u.addresses.find((a) => a.isDefault) || u.addresses[0] || null;
        const location = locationFromAddress(addr) || getLocation(s.deliveryLocation?.locationId);
        const { items, moves, fulfilments } = routeLines(s, lines, location);
        const subtotal = round(items.reduce((a, i) => a + i.price * i.qty, 0));
        const shipping = Number(inq.quote.shipping) || 0;
        const order = {
          id, userId: u.id, guest: false, customer: { name: u.name, email: u.email, phone: u.phone, company: u.company }, items, subtotal, shipping,
          total: round(subtotal + shipping), status: 'pending', payment: 'unpaid', paymentMethod: paymentMethod || 'bank_transfer',
          address: addr, location, fulfilments, source: 'quote', inquiryId: inq.id, notes: '',
          tracking: '', timeline: [{ status: 'pending', at: now(), note: `Created from accepted quote ${inq.id}` }], createdAt: now(),
          events: [{ at: now(), by: 'System', text: `Routed by location (${location?.city || 'unknown'}).` }],
        };
        set((st) => ({
          orders: [order, ...st.orders],
          counters: { ...st.counters, order: st.counters.order + 1 },
          inquiries: st.inquiries.map((i) => (i.id === inqId ? { ...i, status: 'accepted', orderId: id } : i)),
          ...stockPatch(st, applyStock(st.offers, moves)),
          stockLog: [...logMoves(moves, `Order ${id} (quote ${inq.id})`), ...st.stockLog],
        }));
        return { ok: true, id };
      },
      declineQuote: (inqId) => set((s) => ({ inquiries: s.inquiries.map((i) => (i.id === inqId ? { ...i, status: 'declined' } : i)) })),

      /* ---------------- Admin: inquiries ---------------- */
      setInquiryStatus: (id, status) => set((s) => ({ inquiries: s.inquiries.map((i) => (i.id === id ? { ...i, status } : i)) })),
      addInquiryNote: (id, text) => {
        const by = get().currentUser()?.name || 'Admin';
        set((s) => ({ inquiries: s.inquiries.map((i) => (i.id === id ? { ...i, notes: [...i.notes, { by, text, at: now() }] } : i)) }));
      },
      sendQuote: (id, quote) => set((s) => ({ inquiries: s.inquiries.map((i) => (i.id === id ? { ...i, status: 'quoted', quote: { ...quote, sentAt: now() } } : i)) })),

      /* ---------------- Admin: orders ---------------- */
      updateOrderStatus: (id, status, note = '') => set((s) => {
        const o = s.orders.find((x) => x.id === id);
        if (!o || o.status === status) return {};
        const ful = { ...(o.fulfilments || {}) };
        if (status !== 'cancelled') {
          // moving the whole order forward moves every supplier's share with it
          const target = FUL_FLOW.indexOf(ORDER_TO_FUL[status]);
          Object.keys(ful).forEach((k) => { if (FUL_FLOW.indexOf(ful[k].status) < target) ful[k] = { ...ful[k], status: FUL_FLOW[target], at: now() }; });
        }
        const orders = s.orders.map((x) => (x.id !== id ? x : {
          ...x, status, fulfilments: ful, payment: status === 'delivered' && x.paymentMethod === 'cod' ? 'paid' : x.payment, timeline: [...x.timeline, { status, at: now(), note }],
        }));
        if (status !== 'cancelled' || o.status === 'cancelled') return { orders };
        // restock each supplier warehouse on cancel
        const moves = o.items.filter((i) => i.productId && i.warehouseId).map((i) => ({ vendorId: i.vendorId, productId: i.productId, warehouseId: i.warehouseId, delta: i.qty }));
        return { orders, ...stockPatch(s, applyStock(s.offers, moves)), stockLog: [...logMoves(moves, `Order ${id} cancelled — restocked`), ...s.stockLog] };
      }),
      /** Admin: move one supplier group (or the unassigned lines) to another warehouse. */
      reassignGroup: (orderId, fromKey, toWarehouseId) => {
        const s = get();
        const o = s.orders.find((x) => x.id === orderId);
        const to = s.warehouses.find((w) => w.id === toWarehouseId);
        if (!o || !to) return { ok: false, error: 'Order or warehouse not found.' };
        if (fromKey === toWarehouseId) return { ok: false, error: 'Already assigned to that warehouse.' };
        const idx = indexOffers(s.offers);
        const lines = o.items.filter((i) => (i.warehouseId || UNASSIGNED) === fromKey);
        const short = lines.filter((i) => i.productId && (Number(idx.get(`${to.vendorId}|${i.productId}`)?.stock?.[to.id]) || 0) < i.qty);
        if (short.length) return { ok: false, error: `${to.name} doesn't hold enough of: ${short.map((i) => i.name).join(', ')}.` };
        const km = distanceKm(o.location, getLocation(to.locationId));
        const moves = [
          ...lines.filter((i) => i.productId && i.warehouseId).map((i) => ({ vendorId: i.vendorId, productId: i.productId, warehouseId: i.warehouseId, delta: i.qty })),
          ...lines.filter((i) => i.productId).map((i) => ({ vendorId: to.vendorId, productId: i.productId, warehouseId: to.id, delta: -i.qty })),
        ];
        const vendor = s.users.find((u) => u.id === to.vendorId);
        const ful = { ...(o.fulfilments || {}) };
        delete ful[fromKey];
        ful[to.id] = { status: 'assigned', tracking: '', at: now() };
        const by = actorName(s.currentUser());
        set((st) => ({
          orders: st.orders.map((x) => (x.id !== orderId ? x : {
            ...x, fulfilments: ful,
            items: x.items.map((i) => ((i.warehouseId || UNASSIGNED) === fromKey ? { ...i, vendorId: to.vendorId, warehouseId: to.id, distanceKm: km } : i)),
            events: [...(x.events || []), { at: now(), by, text: `${lines.length} line(s) assigned to ${vendor?.company || 'supplier'} · ${to.name}` }],
          })),
          ...stockPatch(st, applyStock(st.offers, moves)),
          stockLog: [...logMoves(moves, `Order ${orderId} reassigned`, by), ...st.stockLog],
        }));
        return { ok: true };
      },
      setOrderPayment: (id, payment) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, payment } : o)) })),
      setOrderTracking: (id, tracking) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, tracking } : o)) })),

      /* ---------------- Supplier (vendor) side ---------------- */
      /** Supplier moves their share of an order forward: accepted → packed → shipped → delivered. */
      setFulfilmentStatus: (orderId, warehouseId, status, { tracking } = {}) => {
        const s = get();
        const me = s.currentUser();
        const o = s.orders.find((x) => x.id === orderId);
        const wh = s.warehouses.find((w) => w.id === warehouseId);
        if (!o || !wh || !me || (me.role !== 'admin' && me.id !== wh.vendorId)) return { ok: false, error: 'Not allowed.' };
        if (o.status === 'cancelled') return { ok: false, error: 'This order was cancelled.' };
        const prev = o.fulfilments?.[warehouseId] || {};
        const ful = { ...(o.fulfilments || {}), [warehouseId]: { ...prev, status, tracking: tracking ?? prev.tracking ?? '', at: now() } };
        const next = { ...o, fulfilments: ful };
        const derived = statusFromGroups(fulfilmentGroups(next));
        const city = whCity(s, warehouseId);
        const moved = ORDER_RANK[derived] > (ORDER_RANK[o.status] ?? 0);
        const notes = { confirmed: 'Confirmed by our warehouse', packed: `Packed at our ${city} warehouse`, shipped: `Dispatched from our ${city} warehouse`, delivered: 'Delivered' };
        const trackings = [...new Set(Object.values(ful).map((f) => f.tracking).filter(Boolean))].join(', ');
        set((st) => ({
          orders: st.orders.map((x) => (x.id !== orderId ? x : {
            ...next, tracking: trackings || x.tracking,
            ...(moved ? { status: derived, timeline: [...x.timeline, { status: derived, at: now(), note: notes[derived] || '' }] } : {}),
            events: [...(x.events || []), { at: now(), by: actorName(me), text: `${wh.name}: ${status}${tracking ? ` · tracking ${tracking}` : ''}` }],
          })),
        }));
        return { ok: true };
      },
      /** Supplier can't fill it → stock goes back and the lines are re-routed to the next nearest supplier. */
      rejectFulfilment: (orderId, warehouseId, reason = '') => {
        const s = get();
        const me = s.currentUser();
        const o = s.orders.find((x) => x.id === orderId);
        const wh = s.warehouses.find((w) => w.id === warehouseId);
        if (!o || !wh || !me || (me.role !== 'admin' && me.id !== wh.vendorId)) return { ok: false, error: 'Not allowed.' };
        const lines = o.items.filter((i) => i.warehouseId === warehouseId);
        const back = lines.filter((i) => i.productId).map((i) => ({ vendorId: i.vendorId, productId: i.productId, warehouseId, delta: i.qty }));
        const declined = [...new Set([...(o.declinedBy || []), wh.vendorId])];
        const afterBack = { ...s, offers: applyStock(s.offers, back) };
        const plan = routeLines(afterBack, lines.map(({ vendorId, warehouseId: w, distanceKm: d, ...rest }) => rest), o.location, declined);
        let k = 0;
        const items = o.items.map((i) => (i.warehouseId === warehouseId ? plan.items[k++] : i));
        const ful = { ...(o.fulfilments || {}) };
        delete ful[warehouseId];
        Object.keys(plan.fulfilments).forEach((w) => { if (!ful[w]) ful[w] = plan.fulfilments[w]; });
        const lost = plan.items.filter((i) => !i.warehouseId).length;
        set((st) => ({
          orders: st.orders.map((x) => (x.id !== orderId ? x : {
            ...x, items, fulfilments: ful, declinedBy: declined,
            events: [...(x.events || []), { at: now(), by: actorName(me), text: `${wh.name} declined${reason ? ` (${reason})` : ''} — ${lost ? `${lost} line(s) need a supplier` : 're-routed to the next nearest supplier'}` }],
          })),
          ...stockPatch(st, applyStock(applyStock(st.offers, back), plan.moves)),
          stockLog: [...logMoves(plan.moves, `Order ${orderId} re-routed`), ...logMoves(back, `Order ${orderId} declined by ${actorName(me)}`), ...st.stockLog],
        }));
        return { ok: true, lost };
      },
      saveWarehouse: (w) => {
        const me = get().currentUser();
        const vendorId = w.vendorId || me?.id;
        if (!vendorId) return { ok: false };
        set((s) => (w.id && s.warehouses.some((x) => x.id === w.id)
          ? { warehouses: s.warehouses.map((x) => (x.id === w.id ? { ...x, ...w } : x)) }
          : { warehouses: [...s.warehouses, { active: true, ...w, vendorId, id: rid('wh-') }] }));
        return { ok: true };
      },
      /** Supplier lists a catalogue product (or updates it): supply price + stock per warehouse. */
      saveOffer: ({ productId, cost, stock, status }, vendorId) => {
        const s = get();
        const me = s.currentUser();
        const vid = vendorId || me?.id;
        const by = actorName(me);
        const old = s.offers.find((o) => o.vendorId === vid && o.productId === productId);
        const clean = Object.fromEntries(Object.entries(stock || {}).map(([w, n]) => [w, Math.max(0, parseInt(n, 10) || 0)]));
        const log = Object.entries(clean).map(([w, n]) => ({ w, d: n - (Number(old?.stock?.[w]) || 0) })).filter((x) => x.d !== 0)
          .map((x) => ({ id: rid('sl'), productId, warehouseId: x.w, vendorId: vid, change: x.d, reason: old ? 'Stock updated by supplier' : 'Listed by supplier', at: now(), by }));
        const offer = { ...(old || { id: rid('of-'), vendorId: vid, productId }), cost: cost === '' || cost === null || cost === undefined ? null : Math.max(0, Number(cost)), stock: { ...(old?.stock || {}), ...clean }, status: status || old?.status || 'active', updatedAt: now() };
        const offers = old ? s.offers.map((o) => (o.id === old.id ? offer : o)) : [...s.offers, offer];
        set((st) => ({ ...stockPatch(st, offers), stockLog: [...log, ...st.stockLog] }));
        return { ok: true };
      },
      removeOffer: (offerId) => set((s) => stockPatch(s, s.offers.filter((o) => o.id !== offerId))),
      /** +/- stock in one warehouse (admin inventory and supplier quick edit). */
      adjustWarehouseStock: ({ vendorId, productId, warehouseId }, change, reason) => {
        const s = get();
        const by = actorName(s.currentUser());
        let offers = s.offers;
        if (!offers.some((o) => o.vendorId === vendorId && o.productId === productId)) {
          offers = [...offers, { id: rid('of-'), vendorId, productId, cost: null, stock: {}, status: 'active', updatedAt: now() }];
        }
        offers = applyStock(offers, [{ vendorId, productId, warehouseId, delta: change }]);
        set((st) => ({ ...stockPatch(st, offers), stockLog: [{ id: rid('sl'), productId, warehouseId, vendorId, change, reason: reason || 'Manual adjustment', at: now(), by }, ...st.stockLog] }));
      },

      /* ---------------- Admin: catalogue & inventory ---------------- */
      saveProduct: (product) => set((s) => {
        const { stock, ...rest } = product;
        if (product.id && s.products.some((p) => p.id === product.id)) return { products: s.products.map((p) => (p.id === product.id ? { ...p, ...rest } : p)) };
        const id = rid('np');
        const products = [{ status: 'active', stock: 0, lowStock: 10, moq: 1, featured: false, bestSeller: false, newArrival: true, recommended: false, ...rest, id, sku: product.sku || `JLF-${(product.dept || 'GEN').slice(0, 3).toUpperCase()}-${String(s.products.length + 1).padStart(3, '0')}` }, ...s.products];
        // opening stock goes into JOLOF's own warehouse
        const houseWh = s.warehouses.find((w) => w.vendorId === HOUSE_VENDOR);
        const offers = stock > 0 && houseWh ? [...s.offers, { id: rid('of-'), vendorId: HOUSE_VENDOR, productId: id, cost: null, stock: { [houseWh.id]: stock }, status: 'active', updatedAt: now() }] : s.offers;
        return { offers, products: recalcProductStock(products, offers, s.users) };
      }),
      deleteProduct: (id) => set((s) => ({ products: s.products.filter((p) => p.id !== id), offers: s.offers.filter((o) => o.productId !== id), cart: Object.fromEntries(Object.entries(s.cart).filter(([k]) => k !== id)), wish: s.wish.filter((w) => w !== id) })),
      /** Legacy single-number adjustment → applied to JOLOF's own warehouse. */
      adjustStock: (id, change, reason) => {
        const houseWh = get().warehouses.find((w) => w.vendorId === HOUSE_VENDOR);
        if (houseWh) get().adjustWarehouseStock({ vendorId: HOUSE_VENDOR, productId: id, warehouseId: houseWh.id }, change, reason);
      },
      saveCategory: (cat) => set((s) => {
        if (cat.id && s.categories.some((c) => c.id === cat.id)) {
          const old = s.categories.find((c) => c.id === cat.id);
          return {
            categories: s.categories.map((c) => (c.id === cat.id ? { ...c, ...cat } : c)),
            // keep products pointing at a renamed category
            products: old.name !== cat.name ? s.products.map((p) => (p.dept === old.dept && p.cat === old.name ? { ...p, cat: cat.name } : p)) : s.products,
          };
        }
        return { categories: [...s.categories, { status: 'active', ...cat, id: rid('cat-') }] };
      }),
      deleteCategory: (id) => set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),
      saveCommodity: (c) => set((s) => (c.id && s.commodities.some((x) => x.id === c.id)
        ? { commodities: s.commodities.map((x) => (x.id === c.id ? { ...x, ...c } : x)) }
        : { commodities: [...s.commodities, { status: 'active', unit: 'MT', ...c, id: rid('cm') }] })),
      deleteCommodity: (id) => set((s) => ({ commodities: s.commodities.filter((c) => c.id !== id) })),

      /* ---------------- Admin: customers ---------------- */
      // approving / suspending a supplier also adds / removes their stock from the storefront
      setUserStatus: (id, status) => set((s) => {
        const users = s.users.map((u) => (u.id === id ? { ...u, status } : u));
        return { users, products: recalcProductStock(s.products, s.offers, users) };
      }),

      /* ---------------- Misc ---------------- */
      subscribe: (email) => set((s) => (s.subscribers.some((x) => x.email === email) ? {} : { subscribers: [{ email, at: now() }, ...s.subscribers] })),
      resetDemo: () => set({ ...seedState() }),
    }),
    {
      name: STORE_KEY,
      version: 2,
      // v2 added suppliers, warehouses and routing — older saved demo data is replaced with the new seed
      migrate: (persisted, version) => (version < 2 ? seedState() : persisted),
      storage: createJSONStorage(() => {
        try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return localStorage; } catch { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, removeItem: (k) => { delete m[k]; } }; }
      }),
      skipHydration: true,
      partialize: (s) => Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== 'function')),
    },
  ),
);

/** Rehydrates the persisted store once on the client and keeps tabs in sync. */
export function useHydrateStore() {
  useEffect(() => {
    useStore.persist.rehydrate();
    const onStorage = (e) => { if (e.key === STORE_KEY) useStore.persist.rehydrate(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
}

/** true once persisted data has loaded on the client — gate anything user-specific on it. */
export function useStoreReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (useStore.persist.hasHydrated()) setReady(true);
    return useStore.persist.onFinishHydration(() => setReady(true));
  }, []);
  return ready;
}

/** Current logged-in user (reactive). */
export const useCurrentUser = () => useStore((s) => s.users.find((u) => u.id === s.sessionUserId) || null);
