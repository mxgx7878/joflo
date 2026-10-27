'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { FEATURED, BEST, NEW, RECO } from '@/lib/catalogue';
import { useToast } from '@/components/Providers';
import { useUI } from './ui';

/* ---------- Reveal-on-scroll (same .reveal/.in classes as the original) ---------- */
export function Reveal({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useRef(null);
  const [inView, setIn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) { setIn(true); return; }
    const io = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { setIn(true); io.unobserve(x.target); } }), { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={`reveal ${inView ? 'in' : ''} ${className}`} {...rest}>{children}</Tag>;
}

/* ---------- Links that drive the shop filter / cosmetics tab ---------- */
export function FilterLink({ dept = '', cat = '', className = '', children, ...rest }) {
  const setFilter = useUI((s) => s.setFilter);
  return (
    <a href="#shop" className={className} onClick={(e) => { e.preventDefault(); setFilter({ dept, cat }); }} {...rest}>{children}</a>
  );
}
export function CosLink({ cat = '', className = '', children, ...rest }) {
  const setCosCat = useUI((s) => s.setCosCat);
  const closeAll = useUI((s) => s.closeAll);
  return <a href="#cosmetics" className={className} onClick={() => { setCosCat(cat); closeAll(); }} {...rest}>{children}</a>;
}
export function SoonLink({ className = '', children }) {
  const toast = useToast();
  return (
    <a href="#" className={className} onClick={(e) => { e.preventDefault(); toast({ text: `${typeof children === 'string' ? children : 'This'} page will be published with the full store.` }); }}>{children}</a>
  );
}

/* ---------- Catalogue derived from the shared store ---------- */
const orderBy = (arr) => (a, b) => {
  const ia = arr.indexOf(a.id), ib = arr.indexOf(b.id);
  return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
};
export function useCatalogue() {
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const commodities = useStore((s) => s.commodities);
  return useMemo(() => {
    const catStatus = (dept, cat) => categories.find((c) => c.dept === dept && c.name === cat)?.status || 'active';
    const visible = products.filter((p) => p.status === 'active' && catStatus(p.dept, p.cat) !== 'hidden');
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    const activeCommodities = commodities.filter((c) => c.status === 'active');
    return {
      products: visible,
      byId,
      categories,
      catStatus,
      commodities: activeCommodities,
      featured: visible.filter((p) => p.featured).sort(orderBy(FEATURED)),
      best: visible.filter((p) => p.bestSeller).sort(orderBy(BEST)),
      fresh: visible.filter((p) => p.newArrival).sort(orderBy(NEW)),
      reco: visible.filter((p) => p.recommended).sort(orderBy(RECO)),
      // the cosmetics wholesale catalogue (k1/k2 are listed in the main shop only, as on the original page)
      cosmetics: visible.filter((p) => p.dept === 'Cosmetics' && !['k1', 'k2'].includes(p.id)),
      count: (dept, cat) => visible.filter((p) => p.dept === dept && p.cat === cat).length,
    };
  }, [products, categories, commodities]);
}

/* ---------- Product actions with toasts ---------- */
export function useProductActions() {
  const toast = useToast();
  const addToCartS = useStore((s) => s.addToCart);
  const toggleWishS = useStore((s) => s.toggleWish);
  const products = useStore((s) => s.products);
  const { openPanel, openEnquiry } = useUI.getState();

  const find = (id) => products.find((p) => p.id === id);
  const enquire = (id) => {
    const p = find(id);
    if (!p) return;
    openEnquiry({ type: 'product', productId: id, dept: p.dept, kicker: `${p.dept} Wholesale`, title: 'Enquire Now' });
  };
  const add = (id, qty = 1) => {
    const p = find(id);
    if (!p) return;
    if (typeof p.price !== 'number') { enquire(id); return; }
    addToCartS(id, qty);
    document.querySelectorAll('[data-cart-count]').forEach((b) => { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); });
    toast({ text: <><b>{p.name}</b> added to cart</>, product: p, action: { label: 'VIEW CART', onClick: () => useUI.getState().openPanel('cart') } });
  };
  const wish = (id) => {
    const p = find(id);
    if (!p) return;
    const on = toggleWishS(id);
    if (on) toast({ text: <><b>{p.name}</b> saved to wishlist</>, product: p, action: { label: 'VIEW', onClick: () => useUI.getState().openPanel('wish') } });
    else toast({ text: 'Removed from wishlist', product: p });
  };
  return { add, wish, enquire, openPanel };
}

export const tagStyle = { New: 'bg-emerald text-white', Bulk: 'bg-gold-soft text-navy' };
