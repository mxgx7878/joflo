'use client';
import { useMemo } from 'react';
import { useStore, useCurrentUser } from '@/lib/store';
import { fulfilmentGroups, supplyValue } from '@/lib/fulfilment';

/** Everything the signed-in supplier owns: warehouses, offers and their share of each order. */
export function useVendor() {
  const me = useCurrentUser();
  const warehouses = useStore((s) => s.warehouses);
  const offers = useStore((s) => s.offers);
  const orders = useStore((s) => s.orders);
  const products = useStore((s) => s.products);
  return useMemo(() => {
    if (!me || me.role !== 'vendor') return { me: null, warehouses: [], offers: [], jobs: [], products };
    const myWh = warehouses.filter((w) => w.vendorId === me.id);
    const myOffers = offers.filter((o) => o.vendorId === me.id);
    // one "job" = this supplier's share of one order from one warehouse
    const jobs = [];
    orders.forEach((o) => {
      fulfilmentGroups(o).forEach((g) => {
        if (g.vendorId !== me.id) return;
        jobs.push({ ...g, order: o, warehouse: myWh.find((w) => w.id === g.warehouseId), value: supplyValue(g.items, offers), units: g.items.reduce((s, i) => s + i.qty, 0) });
      });
    });
    return { me, warehouses: myWh, offers: myOffers, jobs, products };
  }, [me, warehouses, offers, orders, products]);
}

export const OPEN_JOB = ['assigned', 'accepted', 'packed'];
export const totalStock = (offer) => Object.values(offer?.stock || {}).reduce((s, n) => s + (Number(n) || 0), 0);
