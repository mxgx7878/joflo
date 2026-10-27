'use client';
import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { fulfilmentGroups, supplyValue } from '@/lib/fulfilment';
import { getLocation } from '@/lib/locations';

export const SUPPLIER_STATUS = {
  active: { label: 'Active', cls: 'bg-[#E3F2EA] text-emerald' },
  pending: { label: 'Pending approval', cls: 'bg-gold-pale text-[#8a6417]' },
  suspended: { label: 'Suspended', cls: 'bg-[#F8E7E3] text-[#B4432F]' },
};

/** Per-supplier rollups for the admin: warehouses, listings, stock and routed orders. */
export function useSuppliers() {
  const users = useStore((s) => s.users);
  const warehouses = useStore((s) => s.warehouses);
  const offers = useStore((s) => s.offers);
  const orders = useStore((s) => s.orders);
  return useMemo(() => {
    const jobsBy = {};
    orders.forEach((o) => fulfilmentGroups(o).forEach((g) => {
      if (!g.vendorId) return;
      (jobsBy[g.vendorId] = jobsBy[g.vendorId] || []).push({ ...g, order: o, value: supplyValue(g.items, offers), units: g.items.reduce((s, i) => s + i.qty, 0) });
    }));
    return users.filter((u) => u.role === 'vendor').map((v) => {
      const wh = warehouses.filter((w) => w.vendorId === v.id);
      const of = offers.filter((o) => o.vendorId === v.id);
      const jobs = jobsBy[v.id] || [];
      return {
        v, warehouses: wh, offers: of, jobs,
        cities: [...new Set(wh.map((w) => getLocation(w.locationId)?.city).filter(Boolean))],
        units: of.reduce((s, o) => s + Object.values(o.stock || {}).reduce((a, n) => a + (Number(n) || 0), 0), 0),
        open: jobs.filter((j) => ['assigned', 'accepted', 'packed'].includes(j.status)).length,
        waiting: jobs.filter((j) => j.status === 'assigned').length,
        value: Math.round(jobs.filter((j) => j.status !== 'cancelled').reduce((s, j) => s + j.value, 0) * 100) / 100,
      };
    });
  }, [users, warehouses, offers, orders]);
}

/** short label for a supplier ("Sahel Wholesale Foods" → "Sahel Wholesale") */
export const shortName = (v) => (v?.type === 'house' ? 'JOLOF' : (v?.company || '').split(' ').slice(0, 2).join(' '));
