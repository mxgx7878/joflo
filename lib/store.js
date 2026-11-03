'use client';
// App store (storefront + customer account + supplier portal + admin).
// Server data comes from /api/bootstrap (scoped to whoever is signed in) and every action calls
// the API, which answers with fresh state. Only the cart, wishlist and chosen delivery location
// live in the browser.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';

const LOCAL_KEY = 'jolof_client_v4';

const SERVER_EMPTY = {
  me: null, sessionUserId: null,
  settings: { showPricing: true, delivery: { amount: 20, perMiles: 100, baseFee: 10, minFee: 15, freeOver: 0 }, invoice: {}, store: {} },
  products: [], departments: [], categories: [], commodities: [], users: [], orders: [], inquiries: [], invoices: [],
  warehouses: [], offers: [], stockLog: [], subscribers: [], drivers: [], productRequests: [],
};
const SERVER_KEYS = Object.keys(SERVER_EMPTY);
const pickServer = (state) => Object.fromEntries(SERVER_KEYS.map((k) => [k, state[k] ?? SERVER_EMPTY[k]]));

export const quoteTotal = (q) => Math.round(((q?.lines || []).reduce((s, l) => s + l.qty * l.unitPrice, 0) + (Number(q?.shipping) || 0) - (Number(q?.discount) || 0)) * 100) / 100;

const emitError = (msg) => { if (typeof window !== 'undefined' && msg) window.dispatchEvent(new CustomEvent('jolof:error', { detail: msg })); };

/** fetch → { ok, error?, ...data }; applies returned state. notify=true toasts errors globally. */
async function call(path, { method = 'POST', body, notify = true } = {}) {
  let j;
  try {
    const r = await fetch(path, { method, credentials: 'same-origin', headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined, body: body !== undefined ? JSON.stringify(body) : undefined });
    j = await r.json().catch(() => ({ ok: false, error: `Server error (${r.status})` }));
  } catch {
    j = { ok: false, error: 'Could not reach the server — check your connection.' };
  }
  if (j.state) useStore.setState({ ...pickServer(j.state), loaded: true });
  if (!j.ok && notify) emitError(j.error);
  return j;
}

export const useStore = create(
  persist(
    (set, get) => ({
      ...SERVER_EMPTY,
      loaded: false,
      lastOrder: null, // confirmation for the order just placed (guests can't load orders later)
      cart: {}, // { productId: qty }
      wish: [], // [productId]
      deliveryLocation: null, // { locationId, suburb, postcode }

      refresh: () => call('/api/bootstrap', { method: 'GET' }),
      currentUser: () => get().me,

      /* ---------------- Auth & account ---------------- */
      login: (email, password) => call('/api/auth/login', { body: { email, password }, notify: false }),
      logout: () => call('/api/auth/logout'),
      register: (data) => call('/api/auth/register', { body: data, notify: false }),
      updateProfile: (patch) => call('/api/account/profile', { method: 'PATCH', body: patch }),
      saveAddress: (address) => call('/api/account/addresses', { body: address }),
      removeAddress: (id) => call(`/api/account/addresses?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),

      /* ---------------- Cart & wishlist (browser only) ---------------- */
      canBuy: (p) => !!p && p.status !== 'hidden' && typeof p.price === 'number' && get().settings.showPricing !== false,
      addToCart: (id, qty = 1) => {
        const p = get().products.find((x) => x.id === id);
        if (!get().canBuy(p)) return false;
        set((s) => ({ cart: { ...s.cart, [id]: Math.min(999, (s.cart[id] || 0) + qty) } }));
        return true;
      },
      setQty: (id, qty) => set((s) => { const c = { ...s.cart }; if (qty <= 0) delete c[id]; else c[id] = Math.min(999, qty); return { cart: c }; }),
      removeFromCart: (id) => set((s) => { const c = { ...s.cart }; delete c[id]; return { cart: c }; }),
      clearCart: () => set({ cart: {} }),
      toggleWish: (id) => { const on = get().wish.includes(id); set((s) => ({ wish: on ? s.wish.filter((x) => x !== id) : [...s.wish, id] })); return !on; },
      setDeliveryLocation: (loc) => set({ deliveryLocation: loc ? { locationId: loc.locationId, suburb: loc.suburb || '', postcode: loc.postcode || '' } : null }),

      /* ---------------- Orders (customer) ---------------- */
      /** cart lines that can be ordered right now (priced, visible); the rest go to a quote request */
      cartItems: () => Object.entries(get().cart).filter(([id]) => get().canBuy(get().products.find((p) => p.id === id))).map(([productId, qty]) => ({ productId, qty })),
      /** delivery estimate for the cart → { deliveryFee, miles, shipments, unavailable, precise } */
      previewDelivery: async ({ address, addressId }) => (await call('/api/orders/preview', { body: { items: get().cartItems(), address, addressId }, notify: false })).estimate || null,
      placeOrder: async ({ address, addressId, notes, guest, paymentMethod = 'cod' }) => {
        const r = await call('/api/orders', { body: { items: get().cartItems(), address, addressId, notes, guest, paymentMethod }, notify: false });
        if (r.ok) {
          const ordered = new Set(get().cartItems().map((i) => i.productId));
          set((st) => ({ cart: Object.fromEntries(Object.entries(st.cart).filter(([id]) => !ordered.has(id))), lastOrder: r.order || null }));
        }
        return r;
      },
      cancelOrder: (id) => call(`/api/orders/${id}/cancel`),

      /* ---------------- Inquiries / quotes ---------------- */
      submitInquiry: (data) => call('/api/inquiries', { body: data, notify: false }),
      acceptQuote: (id, opts = {}) => call(`/api/inquiries/${id}/accept`, { body: opts, notify: false }),
      declineQuote: (id) => call(`/api/inquiries/${id}/decline`),

      /* ---------------- Admin: inquiries & quotes ---------------- */
      setInquiryStatus: (id, status) => call(`/api/admin/inquiries/${id}`, { method: 'PATCH', body: { status } }),
      addInquiryNote: (id, note) => call(`/api/admin/inquiries/${id}`, { method: 'PATCH', body: { note } }),
      sendQuote: (id, quote) => call(`/api/admin/inquiries/${id}/quote`, { body: quote, notify: false }),
      estimateDelivery: async (lines, address) => (await call('/api/admin/delivery-estimate', { body: { lines, address }, notify: false })).estimate || null,

      /* ---------------- Admin: orders ---------------- */
      updateOrderStatus: (id, status, note = '') => call(`/api/admin/orders/${id}`, { method: 'PATCH', body: { status, note } }),
      setOrderPayment: (id, payment) => call(`/api/admin/orders/${id}`, { method: 'PATCH', body: { payment } }),
      setOrderTracking: (id, tracking) => call(`/api/admin/orders/${id}`, { method: 'PATCH', body: { tracking } }),
      assignDriver: (id, driverId) => call(`/api/admin/orders/${id}`, { method: 'PATCH', body: { driverId } }),
      confirmOrder: (id, payload) => call(`/api/admin/orders/${id}/confirm`, { body: payload, notify: false }),
      reassignGroup: (orderId, from, to) => call(`/api/admin/orders/${orderId}/reassign`, { body: { from, to }, notify: false }),

      /* ---------------- Supplier side ---------------- */
      setFulfilmentStatus: (orderId, warehouseId, status, { tracking } = {}) => call('/api/vendor/fulfilments', { body: { orderId, warehouseId, status, tracking }, notify: false }),
      rejectFulfilment: (orderId, warehouseId, reason = '') => call('/api/vendor/fulfilments/reject', { body: { orderId, warehouseId, reason }, notify: false }),
      saveWarehouse: (w) => call('/api/warehouses', { body: w }),
      saveOffer: (offer, vendorId) => call('/api/offers', { body: { ...offer, vendorId } }),
      removeOffer: (offerId) => call(`/api/offers/${offerId}`, { method: 'DELETE' }),
      adjustWarehouseStock: ({ productId, warehouseId }, change, reason) => call('/api/stock/adjust', { body: { productId, warehouseId, change, reason } }),
      requestProduct: (data) => call('/api/vendor/product-requests', { body: data, notify: false }),

      /* ---------------- Admin: catalogue ---------------- */
      saveProduct: (product) => call('/api/admin/products', { body: product, notify: false }),
      deleteProduct: (id) => call(`/api/admin/products/${id}`, { method: 'DELETE' }),
      saveDepartment: (d) => call('/api/admin/departments', { body: d, notify: false }),
      deleteDepartment: (id) => call(`/api/admin/departments/${id}`, { method: 'DELETE' }),
      sortDepartments: (ids) => call('/api/admin/departments/sort', { body: { ids } }),
      saveCategory: (cat) => call('/api/admin/categories', { body: cat, notify: false }),
      deleteCategory: (id) => call(`/api/admin/categories/${id}`, { method: 'DELETE' }),
      saveCommodity: (c) => call('/api/admin/commodities', { body: c }),
      deleteCommodity: (id) => call(`/api/admin/commodities/${id}`, { method: 'DELETE' }),
      reviewProductRequest: (id, action, payload = {}) => call(`/api/admin/product-requests/${id}`, { body: { ...payload, action }, notify: false }),

      /* ---------------- Admin: people, drivers, settings ---------------- */
      setUserStatus: (id, status) => call(`/api/admin/users/${id}`, { method: 'PATCH', body: { status } }),
      saveDriver: (d) => call('/api/admin/drivers', { body: d, notify: false }),
      deleteDriver: (id) => call(`/api/admin/drivers/${id}`, { method: 'DELETE' }),
      saveSettings: (patch) => call('/api/admin/settings', { method: 'PUT', body: patch }),
      resetDemo: () => call('/api/admin/reset'),

      /* ---------------- Misc ---------------- */
      subscribe: (email) => call('/api/subscribe', { body: { email } }),
    }),
    {
      name: LOCAL_KEY,
      version: 4,
      storage: createJSONStorage(() => {
        try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return localStorage; } catch { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, removeItem: (k) => { delete m[k]; } }; }
      }),
      skipHydration: true,
      partialize: (s) => ({ cart: s.cart, wish: s.wish, deliveryLocation: s.deliveryLocation }),
    },
  ),
);

/** Loads the cart from the browser + server data once, and keeps tabs in sync. */
export function useHydrateStore() {
  useEffect(() => {
    useStore.persist.rehydrate();
    useStore.getState().refresh();
    const onStorage = (e) => { if (e.key === LOCAL_KEY) useStore.persist.rehydrate(); };
    // pick up changes made elsewhere (another tab, supplier portal, admin) when the tab regains focus
    let last = Date.now();
    const onFocus = () => { if (Date.now() - last > 15000) { last = Date.now(); useStore.getState().refresh(); } };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('focus', onFocus); };
  }, []);
}

/** true once server data (and the browser cart) have loaded — gate anything user-specific on it. */
export function useStoreReady() {
  const loaded = useStore((s) => s.loaded);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (useStore.persist.hasHydrated()) setHydrated(true);
    return useStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return loaded && hydrated;
}

/** Current signed-in user (reactive). */
export const useCurrentUser = () => useStore((s) => s.me);
