'use client';
import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShoppingCart, MapPin, X } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { money, fmtDate, ORDER_STATUS, paymentMeta } from '@/lib/format';
import { PageHeader, Pill, Tabs, EmptyState } from '@/components/ui';
import { Card, TableWrap, SearchBox, Select, Skeleton } from '@/components/admin/common';
import { geoOf, STATE_NAMES, BOROUGHS } from '@/lib/usgeo';
import { shortName } from '@/components/admin/suppliers';

const STATUSES = ['all', 'pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

function OrdersInner() {
  const ready = useStoreReady();
  const orders = useStore((s) => s.orders);
  const users = useStore((s) => s.users);
  const drivers = useStore((s) => s.drivers);
  const dById = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);
  const vById = useMemo(() => Object.fromEntries(users.filter((u) => u.role === 'vendor').map((u) => [u.id, u])), [users]);
  const sp = useSearchParams();
  const [tab, setTab] = useState(sp.get('status') || 'all');
  const [q, setQ] = useState('');
  const [fState, setFState] = useState('');
  const [fBorough, setFBorough] = useState('');
  const [fCounty, setFCounty] = useState('');
  const [fZip, setFZip] = useState('');

  // delivery location of each order: state, ZIP, NYC borough, county
  const geo = useMemo(() => Object.fromEntries(orders.map((o) => [o.id, geoOf({ ...(o.location || {}), ...(o.address || {}) })])), [orders]);

  const stateOpts = useMemo(() => {
    const n = {};
    orders.forEach((o) => { const s = geo[o.id]?.state; if (s) n[s] = (n[s] || 0) + 1; });
    return Object.keys(n).sort((a, b) => (STATE_NAMES[a] || a).localeCompare(STATE_NAMES[b] || b)).map((s) => ({ value: s, label: `${STATE_NAMES[s] || s} (${n[s]})` }));
  }, [orders, geo]);
  const boroughOpts = useMemo(() => BOROUGHS.map((b) => ({ value: b, label: `${b} (${orders.filter((o) => geo[o.id]?.borough === b).length})` })), [orders, geo]);
  const countyOpts = useMemo(() => {
    const n = {};
    orders.forEach((o) => { const g = geo[o.id]; if (g?.county && (!fState || g.state === fState)) { const k = `${g.county}|${g.state}`; n[k] = (n[k] || 0) + 1; } });
    return Object.keys(n).sort().map((k) => { const [c, st] = k.split('|'); return { value: k, label: `${c}${st ? `, ${st}` : ''} (${n[k]})` }; });
  }, [orders, geo, fState]);

  const locFiltered = useMemo(() => {
    const zip = fZip.trim();
    return orders.filter((o) => {
      const g = geo[o.id] || {};
      if (fState && g.state !== fState) return false;
      if (fBorough && g.borough !== fBorough) return false;
      if (fCounty && `${g.county}|${g.state}` !== fCounty) return false;
      if (zip && !(g.zip || '').startsWith(zip)) return false;
      return true;
    });
  }, [orders, geo, fState, fBorough, fCounty, fZip]);
  const hasLoc = !!(fState || fBorough || fCounty || fZip.trim());
  const clearLoc = () => { setFState(''); setFBorough(''); setFCounty(''); setFZip(''); };

  const counts = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s, s === 'all' ? locFiltered.length : locFiltered.filter((o) => o.status === s).length])), [locFiltered]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return locFiltered.filter((o) => {
      if (tab !== 'all' && o.status !== tab) return false;
      if (!t) return true;
      const g = geo[o.id] || {};
      return `${o.id} ${o.customer.name} ${o.customer.company} ${o.customer.email} ${g.city} ${g.state} ${STATE_NAMES[g.state] || ''} ${g.zip} ${g.borough || ''} ${g.county || ''}`.toLowerCase().includes(t);
    });
  }, [locFiltered, geo, tab, q]);

  if (!ready) return <Skeleton />;

  return (
    <>
      <PageHeader kicker="Sales" title="Orders" sub="Order requests from the store and orders from accepted quotes. Confirm prices to issue the invoice, assign a driver, then track delivery." />
      <Card pad={false}>
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-3 justify-between border-b border-navy/5">
          <Tabs value={tab} onChange={setTab} tabs={STATUSES.map((s) => ({ value: s, label: s === 'all' ? 'All' : ORDER_STATUS[s].label, count: counts[s] }))} />
          <SearchBox value={q} onChange={setQ} placeholder="Order no., customer, company or location" className="lg:w-[320px]" />
        </div>
        <div className="px-4 sm:px-5 py-3 flex flex-wrap items-center gap-2 border-b border-navy/5 bg-ivory/40">
          <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-charcoal/55 mr-1"><MapPin className="w-3.5 h-3.5 text-emerald" />Location</span>
          <Select value={fState} onChange={(v) => { setFState(v); setFCounty(''); if (v && v !== 'NY') setFBorough(''); }} options={[{ value: '', label: 'All states' }, ...stateOpts]} className="max-w-full" />
          <Select value={fBorough} onChange={(v) => { setFBorough(v); if (v) { setFState('NY'); setFCounty(''); } }} options={[{ value: '', label: 'All boroughs (NYC)' }, ...boroughOpts]} className="max-w-full" />
          <Select value={fCounty} onChange={setFCounty} options={[{ value: '', label: 'All counties' }, ...countyOpts]} className="max-w-full" />
          <label className="flex items-center h-10 rounded-full bg-white border-[1.5px] border-[#E2DED2] px-4 focus-within:border-gold transition w-[130px]">
            <input value={fZip} onChange={(e) => setFZip(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))} inputMode="numeric" placeholder="ZIP code" aria-label="ZIP code" className="w-full bg-transparent text-[13px] font-semibold text-navy focus:outline-none" />
          </label>
          {hasLoc && <button type="button" onClick={clearLoc} className="flex items-center gap-1 text-[12.5px] font-bold text-[#B4432F] hover:underline px-2"><X className="w-3.5 h-3.5" />Clear</button>}
          {hasLoc && <span className="text-[12px] text-charcoal/55 ml-auto">{locFiltered.length} order{locFiltered.length === 1 ? '' : 's'} in this area</span>}
        </div>
        {list.length === 0 ? <EmptyState icon={ShoppingCart} title="No orders here" body={hasLoc ? "No orders match this location — try another area or clear the location filter." : "Try another status or search term."} /> : (
          <TableWrap>
            <table className="dash-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th>Ships from</th><th>Driver</th><th>Source</th><th>Payment</th><th>Status</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {list.map((o) => (
                  <tr key={o.id} className="cursor-pointer">
                    <td className="whitespace-nowrap"><Link href={`/admin/orders/${o.id}`} className="font-bold text-navy hover:text-emerald">{o.id}</Link></td>
                    <td className="min-w-[180px]"><span className="font-semibold text-navy">{o.customer.company || o.customer.name}</span><span className="block text-[11.5px] text-charcoal/50">{o.customer.company ? o.customer.name : o.customer.email}</span></td>
                    <td className="whitespace-nowrap text-charcoal/70">{fmtDate(o.createdAt)}</td>
                    <td className="text-charcoal/70">{o.items.reduce((s, i) => s + i.qty, 0)} units<span className="block text-[11.5px] text-charcoal/45">to {o.location?.city || '—'}{geo[o.id]?.state ? `, ${geo[o.id].state}` : ''}{geo[o.id]?.zip ? ` ${geo[o.id].zip}` : ''}{geo[o.id]?.borough ? ` · ${geo[o.id].borough}` : ''}</span></td>
                    <td className="min-w-[150px]">
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(o.items.map((i) => i.vendorId).filter(Boolean))].map((v) => <span key={v} className="pill bg-ivory text-navy border border-navy/10">{shortName(vById[v])}</span>)}
                        {o.items.some((i) => i.productId && !i.warehouseId) && o.status !== 'cancelled' && <span className="pill bg-[#F8E7E3] text-[#B4432F]">Unassigned</span>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-[12.5px]">{o.driverId ? <span className="text-navy font-semibold">{dById[o.driverId]?.name}</span> : ['confirmed', 'packed'].includes(o.status) ? <span className="pill bg-gold-pale text-[#8a6417]">Assign</span> : <span className="text-charcoal/35">—</span>}</td>
                    <td>{o.source === 'quote' ? <span className="pill bg-[#EEE9F8] text-[#5B3FA0]">From quote</span> : o.guest ? <span className="pill bg-ivory text-charcoal/70 border border-navy/10">Guest</span> : <span className="pill bg-ivory text-charcoal/70 border border-navy/10">Online</span>}</td>
                    <td><Pill meta={paymentMeta(o)} /></td>
                    <td><Pill meta={ORDER_STATUS[o.status]} /></td>
                    <td className="text-right font-bold text-navy whitespace-nowrap">{money(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </>
  );
}

export default function OrdersPage() {
  return <Suspense fallback={<Skeleton />}><OrdersInner /></Suspense>;
}
