'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Package, Search } from 'lucide-react';
import { ORDER_STATUS } from '@/lib/format';
import { PageHeader, Tabs, EmptyState } from '@/components/ui';
import { useMyOrders } from '@/components/account/shared';
import OrdersList from '@/components/account/OrdersList';

const GROUPS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'In progress' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];
const inGroup = (o, g) => g === 'all' || (g === 'active' ? ['pending', 'confirmed', 'packed'].includes(o.status) : o.status === g);

export default function MyOrders() {
  const orders = useMyOrders();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return orders.filter((o) => inGroup(o, tab) && (!s || o.id.toLowerCase().includes(s) || o.items.some((i) => i.name.toLowerCase().includes(s))));
  }, [orders, tab, q]);

  return (
    <>
      <PageHeader kicker="Orders" title="My orders" sub="Track deliveries, reorder favourites and download invoices." actions={<Link href="/#shop" className="dash-btn dash-btn-navy">Shop products</Link>} />
      <div className="dash-card overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-3 justify-between border-b border-navy/5">
          <Tabs tabs={GROUPS.map((g) => ({ ...g, count: orders.filter((o) => inGroup(o, g.value)).length }))} value={tab} onChange={setTab} />
          <label className="relative md:w-72">
            <span className="sr-only">Search orders</span>
            <Search className="w-4 h-4 text-navy/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} className="dash-input !pl-10" placeholder="Order no. or product…" />
          </label>
        </div>
        {list.length ? <OrdersList orders={list} /> : (
          <EmptyState icon={Package} title={orders.length ? 'No orders match' : 'No orders yet'} body={orders.length ? 'Try another filter or search term.' : 'Your orders will appear here once you check out.'}
            action={!orders.length && <Link href="/#shop" className="dash-btn dash-btn-navy">Start shopping</Link>} />
        )}
      </div>
      <p className="text-[12px] text-charcoal/45 mt-4">Status key: {Object.values(ORDER_STATUS).map((s) => s.label).join(' → ').replace(' → Cancelled', '')}.</p>
    </>
  );
}
