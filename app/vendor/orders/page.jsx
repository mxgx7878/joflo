'use client';
import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { useStoreReady } from '@/lib/store';
import { money, fmtDate } from '@/lib/format';
import { kmAway } from '@/lib/locations';
import { FUL_STATUS, FUL_SHORT } from '@/lib/fulfilment';
import { PageHeader, Pill, Tabs, EmptyState } from '@/components/ui';
import { Card, TableWrap, SearchBox, Select, Skeleton } from '@/components/admin/common';
import { useVendor, OPEN_JOB } from '@/components/vendor/hooks';

const TABS = ['all', 'assigned', 'open', 'shipped', 'delivered', 'cancelled'];
const TAB_LABEL = { all: 'All', assigned: 'New', open: 'To ship', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };
const match = (tab, j) => tab === 'all' || (tab === 'open' ? ['accepted', 'packed'].includes(j.status) : j.status === tab);

function Inner() {
  const ready = useStoreReady();
  const { jobs, warehouses } = useVendor();
  const sp = useSearchParams();
  const [tab, setTab] = useState(sp.get('status') || 'all');
  const [wh, setWh] = useState('');
  const [q, setQ] = useState('');

  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t, jobs.filter((j) => match(t, j)).length])), [jobs]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return jobs.filter((j) => match(tab, j) && (!wh || j.warehouseId === wh) && (!t || `${j.order.id} ${j.items.map((i) => i.name).join(' ')}`.toLowerCase().includes(t)));
  }, [jobs, tab, wh, q]);

  if (!ready) return <Skeleton />;

  return (
    <>
      <PageHeader kicker="Fulfilment" title="My orders" sub="Each row is the part of a customer order routed to one of your warehouses. Accept it, pack it and add a tracking number when it ships." />
      <Card pad={false}>
        <div className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center gap-3 justify-between border-b border-navy/5">
          <Tabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ value: t, label: TAB_LABEL[t], count: counts[t] }))} />
          <div className="flex flex-col sm:flex-row gap-2">
            {warehouses.length > 1 && <Select value={wh} onChange={setWh} options={[{ value: '', label: 'All warehouses' }, ...warehouses.map((w) => ({ value: w.id, label: w.name }))]} />}
            <SearchBox value={q} onChange={setQ} placeholder="Order no., city or product" className="sm:w-[260px]" />
          </div>
        </div>
        {list.length === 0 ? <EmptyState icon={ShoppingCart} title="No orders here" body={jobs.length ? 'Try another tab or search.' : 'Orders near your warehouses will be routed to you automatically.'} /> : (
          <TableWrap>
            <table className="dash-table">
              <thead><tr><th>Order</th><th>Date</th><th>Ship from</th><th>Delivery</th><th>Items</th><th>Status</th><th className="text-right">Supply value</th></tr></thead>
              <tbody>
                {list.map((j) => (
                  <tr key={j.order.id + j.key}>
                    <td className="whitespace-nowrap">
                      <Link href={`/vendor/orders/${j.order.id}`} className="font-bold text-navy hover:text-emerald">{j.order.id}</Link>
                      {j.order.fulfilments && Object.keys(j.order.fulfilments).length > 1 && <span className="block text-[11px] text-charcoal/45">Split shipment</span>}
                    </td>
                    <td className="whitespace-nowrap text-charcoal/70">{fmtDate(j.order.createdAt)}</td>
                    <td className="min-w-[160px] font-semibold text-navy">{j.warehouse?.name}</td>
                    <td className="whitespace-nowrap text-charcoal/70">By JOLOF<span className="block text-[11.5px] text-charcoal/45">{kmAway(j.distanceKm)}</span></td>
                    <td className="min-w-[200px] text-charcoal/70"><span className="line-clamp-2">{j.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</span></td>
                    <td><Pill meta={FUL_STATUS[j.status]}>{FUL_SHORT[j.status]}</Pill>{OPEN_JOB.includes(j.status) && j.status === 'assigned' && <span className="block text-[11px] text-[#8a6417] font-bold mt-1">Action needed</span>}</td>
                    <td className="text-right font-bold text-navy whitespace-nowrap">{money(j.value)}</td>
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

export default function VendorOrdersPage() {
  return <Suspense fallback={<Skeleton />}><Inner /></Suspense>;
}
