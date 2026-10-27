'use client';
import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Users, Check, X } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { money, fmtDate, USER_STATUS } from '@/lib/format';
import { PageHeader, Pill, Tabs, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Card, TableWrap, SearchBox, Skeleton, Initials } from '@/components/admin/common';

function CustomersInner() {
  const ready = useStoreReady();
  const users = useStore((s) => s.users);
  const orders = useStore((s) => s.orders);
  const setUserStatus = useStore((s) => s.setUserStatus);
  const toast = useToast();
  const sp = useSearchParams();
  const [tab, setTab] = useState(sp.get('tab') || 'all');
  const [q, setQ] = useState('');

  const customers = useMemo(() => users.filter((u) => u.role === 'customer'), [users]);
  const stats = useMemo(() => Object.fromEntries(customers.map((u) => {
    const mine = orders.filter((o) => o.userId === u.id && o.status !== 'cancelled');
    return [u.id, { n: mine.length, ltv: mine.reduce((s, o) => s + o.total, 0) }];
  })), [customers, orders]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return customers.filter((u) => (tab === 'all' || (tab === 'pending' ? u.status === 'pending' : u.type === tab)) && (!t || `${u.name} ${u.email} ${u.company}`.toLowerCase().includes(t)))
      .sort((a, b) => (a.status === 'pending') === (b.status === 'pending') ? new Date(b.createdAt) - new Date(a.createdAt) : a.status === 'pending' ? -1 : 1);
  }, [customers, tab, q]);

  if (!ready) return <Skeleton />;

  const approve = (u) => { setUserStatus(u.id, 'active'); toast({ text: `${u.company || u.name} approved — they can now order` }); };
  const reject = (u) => { setUserStatus(u.id, 'suspended'); toast({ text: `${u.company || u.name} rejected` }); };

  return (
    <>
      <PageHeader kicker="People" title="Customers" sub="Retailers and individual buyers. Retailer accounts need approval before they can check out." />
      <Card pad={false}>
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-3 justify-between border-b border-navy/5">
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'all', label: 'All', count: customers.length },
            { value: 'retailer', label: 'Retailers', count: customers.filter((u) => u.type === 'retailer').length },
            { value: 'individual', label: 'Individuals', count: customers.filter((u) => u.type === 'individual').length },
            { value: 'pending', label: 'Pending approval', count: customers.filter((u) => u.status === 'pending').length },
          ]} />
          <SearchBox value={q} onChange={setQ} placeholder="Name, email, company" className="md:w-[260px]" />
        </div>
        {list.length === 0 ? <EmptyState icon={Users} title="No customers here" /> : (
          <TableWrap>
            <table className="dash-table">
              <thead><tr><th>Customer</th><th>Type</th><th>Joined</th><th className="text-right">Orders</th><th className="text-right">Lifetime value</th><th>Status</th><th /></tr></thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id}>
                    <td className="min-w-[240px]">
                      <Link href={`/admin/customers/${u.id}`} className="flex items-center gap-3 group">
                        <Initials name={u.name} className={`w-9 h-9 text-[12px] ${u.type === 'retailer' ? '!bg-emerald' : ''}`} />
                        <span className="min-w-0"><span className="block font-bold text-navy group-hover:text-emerald truncate">{u.company || u.name}</span><span className="block text-[11.5px] text-charcoal/50 truncate">{u.company ? `${u.name} · ` : ''}{u.email}</span></span>
                      </Link>
                    </td>
                    <td>{u.type === 'retailer' ? <span className="pill bg-navy text-gold-soft">Retailer</span> : <span className="pill bg-ivory text-navy border border-navy/10">Individual</span>}</td>
                    <td className="whitespace-nowrap text-charcoal/70">{fmtDate(u.createdAt)}</td>
                    <td className="text-right font-semibold text-navy">{stats[u.id]?.n || 0}</td>
                    <td className="text-right font-bold text-navy whitespace-nowrap">{money(stats[u.id]?.ltv || 0)}</td>
                    <td><Pill meta={USER_STATUS[u.status]} /></td>
                    <td className="text-right whitespace-nowrap">
                      {u.status === 'pending' ? (
                        <span className="inline-flex gap-1.5">
                          <button className="dash-btn dash-btn-navy !h-8 !px-3" onClick={() => approve(u)}><Check /> Approve</button>
                          <button className="dash-btn dash-btn-danger !h-8 !px-3" onClick={() => reject(u)} aria-label="Reject"><X /></button>
                        </span>
                      ) : <Link href={`/admin/customers/${u.id}`} className="text-[12.5px] font-bold text-emerald hover:text-navy">View →</Link>}
                    </td>
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

export default function CustomersPage() {
  return <Suspense fallback={<Skeleton />}><CustomersInner /></Suspense>;
}
