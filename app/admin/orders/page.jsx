'use client';
import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { money, fmtDate, ORDER_STATUS, PAYMENT_STATUS } from '@/lib/format';
import { PageHeader, Pill, Tabs, EmptyState } from '@/components/ui';
import { Card, TableWrap, SearchBox, Skeleton } from '@/components/admin/common';

const STATUSES = ['all', 'pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

function OrdersInner() {
  const ready = useStoreReady();
  const orders = useStore((s) => s.orders);
  const sp = useSearchParams();
  const [tab, setTab] = useState(sp.get('status') || 'all');
  const [q, setQ] = useState('');

  const counts = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s, s === 'all' ? orders.length : orders.filter((o) => o.status === s).length])), [orders]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return orders.filter((o) => (tab === 'all' || o.status === tab) && (!t || `${o.id} ${o.customer.name} ${o.customer.company} ${o.customer.email}`.toLowerCase().includes(t)));
  }, [orders, tab, q]);

  if (!ready) return <Skeleton />;

  return (
    <>
      <PageHeader kicker="Sales" title="Orders" sub="Online checkouts and orders created from accepted quotes. Open an order to confirm, pack, ship and record payment." />
      <Card pad={false}>
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-3 justify-between border-b border-navy/5">
          <Tabs value={tab} onChange={setTab} tabs={STATUSES.map((s) => ({ value: s, label: s === 'all' ? 'All' : ORDER_STATUS[s].label, count: counts[s] }))} />
          <SearchBox value={q} onChange={setQ} placeholder="Order no., customer or company" className="lg:w-[300px]" />
        </div>
        {list.length === 0 ? <EmptyState icon={ShoppingCart} title="No orders here" body="Try another status or search term." /> : (
          <TableWrap>
            <table className="dash-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th>Source</th><th>Payment</th><th>Status</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {list.map((o) => (
                  <tr key={o.id} className="cursor-pointer">
                    <td className="whitespace-nowrap"><Link href={`/admin/orders/${o.id}`} className="font-bold text-navy hover:text-emerald">{o.id}</Link></td>
                    <td className="min-w-[180px]"><span className="font-semibold text-navy">{o.customer.company || o.customer.name}</span><span className="block text-[11.5px] text-charcoal/50">{o.customer.company ? o.customer.name : o.customer.email}</span></td>
                    <td className="whitespace-nowrap text-charcoal/70">{fmtDate(o.createdAt)}</td>
                    <td className="text-charcoal/70">{o.items.reduce((s, i) => s + i.qty, 0)} units</td>
                    <td>{o.source === 'quote' ? <span className="pill bg-[#EEE9F8] text-[#5B3FA0]">From quote</span> : <span className="pill bg-ivory text-charcoal/70 border border-navy/10">Online</span>}</td>
                    <td><Pill meta={PAYMENT_STATUS[o.payment]} /></td>
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
