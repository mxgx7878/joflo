'use client';
// Single demo store for the whole app (storefront + customer account + admin).
// Persisted to localStorage so the flow survives reloads, and synced across tabs so you
// can keep the admin open in one tab and the storefront in another.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import { SEED_PRODUCTS, SEED_COMMODITIES, BASE_CATEGORIES } from './catalogue';
import { SEED_USERS, SEED_ORDERS, SEED_INQUIRIES, SEED_STOCK_LOG, SEED_SUBSCRIBERS } from './seed';

const STORE_KEY = 'jolof_demo_v1';
const round = (n) => Math.round(n * 100) / 100;
const now = () => new Date().toISOString();
const rid = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const SHIPPING_FLAT = 18;
export const FREE_SHIPPING_FROM = 250;
export const shippingFor = (subtotal) => (subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FLAT);
export const quoteTotal = (q) => round((q?.lines || []).reduce((s, l) => s + l.qty * l.unitPrice, 0) + (Number(q?.shipping) || 0));

const seedState = () => ({
  products: SEED_PRODUCTS,
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
        const user = {
          id: rid('u-'), role: 'customer', type: data.type, name: data.name.trim(), email, password: data.password,
          phone: data.phone || '', company: data.company || '', abn: data.abn || '', businessType: data.businessType || '',
          status: data.type === 'retailer' ? 'pending' : 'active', createdAt: now(),
          addresses: data.line1 ? [{ id: 'a1', label: data.type === 'retailer' ? 'Store' : 'Home', line1: data.line1, city: data.city, state: data.state, postcode: data.postcode, country: data.country || 'Australia', isDefault: true }] : [],
        };
        set((s) => ({ users: [...s.users, user], sessionUserId: user.id }));
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

      /* ---------------- Orders ---------------- */
      placeOrder: ({ address, paymentMethod, notes }) => {
        const s = get();
        const u = s.currentUser();
        const items = Object.entries(s.cart).map(([id, qty]) => {
          const p = s.products.find((x) => x.id === id);
          return p && typeof p.price === 'number' ? { productId: id, name: p.name, size: [p.size, p.pack].filter(Boolean).join(' · '), img: p.img, qty, price: p.price } : null;
        }).filter(Boolean);
        if (!u || !items.length) return { ok: false, error: 'Your cart is empty.' };
        const subtotal = round(items.reduce((a, i) => a + i.price * i.qty, 0));
        const shipping = shippingFor(subtotal);
        const id = `JT-${s.counters.order}`;
        const order = {
          id, userId: u.id, customer: { name: u.name, email: u.email, phone: u.phone, company: u.company }, items, subtotal, shipping,
          total: round(subtotal + shipping), status: 'pending', payment: 'unpaid', paymentMethod, address, source: 'checkout', notes: notes || '',
          tracking: '', timeline: [{ status: 'pending', at: now(), note: 'Order placed online' }], createdAt: now(),
        };
        set((st) => ({
          orders: [order, ...st.orders],
          cart: {},
          counters: { ...st.counters, order: st.counters.order + 1 },
          products: st.products.map((p) => { const it = items.find((i) => i.productId === p.id); return it ? { ...p, stock: Math.max(0, p.stock - it.qty) } : p; }),
          stockLog: [...items.map((i) => ({ id: rid('sl'), productId: i.productId, change: -i.qty, reason: `Order ${id}`, at: now(), by: 'System' })), ...st.stockLog],
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
        const items = inq.quote.lines.map((l) => {
          const p = s.products.find((x) => x.id === l.productId);
          return { productId: l.productId || null, name: l.name, size: l.size || (p ? [p.size, p.pack].filter(Boolean).join(' · ') : ''), img: p?.img || null, qty: l.qty, price: l.unitPrice, unit: l.unit };
        });
        const subtotal = round(items.reduce((a, i) => a + i.price * i.qty, 0));
        const shipping = Number(inq.quote.shipping) || 0;
        const order = {
          id, userId: u.id, customer: { name: u.name, email: u.email, phone: u.phone, company: u.company }, items, subtotal, shipping,
          total: round(subtotal + shipping), status: 'pending', payment: 'unpaid', paymentMethod: paymentMethod || 'bank_transfer',
          address: address || u.addresses.find((a) => a.isDefault) || u.addresses[0] || null, source: 'quote', inquiryId: inq.id, notes: '',
          tracking: '', timeline: [{ status: 'pending', at: now(), note: `Created from accepted quote ${inq.id}` }], createdAt: now(),
        };
        set((st) => ({
          orders: [order, ...st.orders],
          counters: { ...st.counters, order: st.counters.order + 1 },
          inquiries: st.inquiries.map((i) => (i.id === inqId ? { ...i, status: 'accepted', orderId: id } : i)),
          products: st.products.map((p) => { const it = items.find((i) => i.productId === p.id); return it ? { ...p, stock: Math.max(0, p.stock - it.qty) } : p; }),
          stockLog: [...items.filter((i) => i.productId).map((i) => ({ id: rid('sl'), productId: i.productId, change: -i.qty, reason: `Order ${id} (quote ${inq.id})`, at: now(), by: 'System' })), ...st.stockLog],
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
      updateOrderStatus: (id, status, note = '') => set((s) => ({
        orders: s.orders.map((o) => {
          if (o.id !== id || o.status === status) return o;
          // restock on cancel
          return { ...o, status, payment: status === 'delivered' && o.paymentMethod === 'cod' ? 'paid' : o.payment, timeline: [...o.timeline, { status, at: now(), note }] };
        }),
        ...(status === 'cancelled' ? (() => {
          const o = s.orders.find((x) => x.id === id);
          if (!o || o.status === 'cancelled') return {};
          return {
            products: s.products.map((p) => { const it = o.items.find((i) => i.productId === p.id); return it ? { ...p, stock: p.stock + it.qty } : p; }),
            stockLog: [...o.items.filter((i) => i.productId).map((i) => ({ id: rid('sl'), productId: i.productId, change: i.qty, reason: `Order ${id} cancelled — restocked`, at: now(), by: 'System' })), ...s.stockLog],
          };
        })() : {}),
      })),
      setOrderPayment: (id, payment) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, payment } : o)) })),
      setOrderTracking: (id, tracking) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, tracking } : o)) })),

      /* ---------------- Admin: catalogue & inventory ---------------- */
      saveProduct: (product) => set((s) => {
        if (product.id && s.products.some((p) => p.id === product.id)) return { products: s.products.map((p) => (p.id === product.id ? { ...p, ...product } : p)) };
        const id = rid('np');
        return { products: [{ status: 'active', stock: 0, lowStock: 10, moq: 1, featured: false, bestSeller: false, newArrival: true, recommended: false, ...product, id, sku: product.sku || `JLF-${(product.dept || 'GEN').slice(0, 3).toUpperCase()}-${String(s.products.length + 1).padStart(3, '0')}` }, ...s.products] };
      }),
      deleteProduct: (id) => set((s) => ({ products: s.products.filter((p) => p.id !== id), cart: Object.fromEntries(Object.entries(s.cart).filter(([k]) => k !== id)), wish: s.wish.filter((w) => w !== id) })),
      adjustStock: (id, change, reason) => {
        const by = get().currentUser()?.name || 'Admin';
        set((s) => ({
          products: s.products.map((p) => (p.id === id ? { ...p, stock: Math.max(0, p.stock + change) } : p)),
          stockLog: [{ id: rid('sl'), productId: id, change, reason: reason || 'Manual adjustment', at: now(), by }, ...s.stockLog],
        }));
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
      setUserStatus: (id, status) => set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, status } : u)) })),

      /* ---------------- Misc ---------------- */
      subscribe: (email) => set((s) => (s.subscribers.some((x) => x.email === email) ? {} : { subscribers: [{ email, at: now() }, ...s.subscribers] })),
      resetDemo: () => set({ ...seedState() }),
    }),
    {
      name: STORE_KEY,
      version: 1,
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
