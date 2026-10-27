'use client';
// Storefront UI state: which drawer/modal is open, the shop filter, cosmetics tab, quick view & enquiry context.
import { create } from 'zustand';

export const useUI = create((set, get) => ({
  panel: null, // 'menu' | 'cart' | 'wish' | 'quick' | 'enquiry'
  quickId: null,
  enquiry: null, // { type, kicker, title, dept, message, productId, commodityId, fromCart }
  megaOpen: false,
  filter: { dept: '', cat: '', q: '' },
  cosCat: '',

  openPanel: (panel) => set({ panel, megaOpen: false }),
  closeAll: () => set({ panel: null, megaOpen: false }),
  setMega: (megaOpen) => set({ megaOpen }),
  openQuick: (id) => set({ panel: 'quick', quickId: id, megaOpen: false }),
  openEnquiry: (enquiry) => set({ panel: 'enquiry', enquiry: { type: 'bulk', ...enquiry, key: Date.now() }, megaOpen: false }),
  setCosCat: (cosCat) => set({ cosCat }),
  setFilter: (f, scroll = true) => {
    set({ filter: { dept: '', cat: '', q: '', ...f }, panel: null, megaOpen: false });
    if (scroll && typeof document !== 'undefined') {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      requestAnimationFrame(() => document.getElementById('shop')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }));
    }
  },
}));
