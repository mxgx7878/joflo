'use client';
import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Warehouse, UserCheck, Boxes, Truck, Check } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { money, fmtDate } from '@/lib/format';
import { PageHeader, StatCard, Pill, Tabs, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Card, TableWrap, SearchBox, Initials, Skeleton } from '@/components/admin/common';
import { useSuppliers, SUPPLIER_STATUS } from '@/components/admin/suppliers';

const rank = (v) => (v.type === 'house' ? 0 : v.status === 'pending' ? 1 : 2);

function Inner() {
  const ready = useStoreReady();
  const rows = useSuppliers();
  const setUserStatus = useStore((s) => s.setUserStatus);
  const toast = useToast();
  const sp = useSearchParams();
  const [tab, setTab] = useState(sp.get('tab') || 'all');
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => (tab === 'all' || r.v.status === tab) && (!t || `${r.v.company} ${r.v.name} ${r.v.email} ${r.cities.join(' ')}`.toLowerCase().includes(t)))
      .sort((a, b) => rank(a.v) - rank(b.v) || a.v.company.localeCompare(b.v.company));
  }, [rows, tab, q]);
  const count = (st) => rows.filter((r) => st === 'all' || r.v.status === st).length;

  if (!ready) return <Skeleton />;

  return (
    <>
      <PageHeader kicker="Supply network" title="Suppliers & wholesalers" sub="Suppliers list catalogue products against their own warehouses. Each order is routed to the nearest warehouse that has the stock." />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Warehouse} label="Active suppliers" value={count('active')} hint={`${rows.reduce((s, r) => s + r.warehouses.length, 0)} warehouses`} />
        <StatCard icon={UserCheck} label="Awaiting approval" value={count('pending')} tone="gold" />
        <StatCard icon={Boxes} label="Units across network" value={rows.filter((r) => r.v.status === 'active').reduce((s, r) => s + r.units, 0).toLocaleString()} tone="emerald" />
        <StatCard icon={Truck} label="Open shipments" value={rows.reduce((s, r) => s + r.open, 0)} hint={`${rows.reduce((s, r) => s + r.waiting, 0)} not yet accepted`} tone="ivory" />
      </div>

      <Card pad={false} className="mt-5">
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-3 justify-between border-b border-navy/5">
          <Tabs value={tab} onChange={setTab} tabs={['all', 'pending', 'active', 'suspended'].map((t) => ({ value: t, label: t === 'all' ? 'All' : SUPPLIER_STATUS[t].label, count: count(t) }))} />
          <SearchBox value={q} onChange={setQ} placeholder="Supplier, contact or city" className="lg:w-[280px]" />
        </div>
        {list.length === 0 ? <EmptyState icon={Warehouse} title="No suppliers here" body="Suppliers apply from the Register page (Supplier / Wholesaler)." /> : (
          <TableWrap>
            <table className="dash-table">
              <thead><tr><th>Supplier</th><th>Warehouses</th><th className="text-center">Products</th><th className="text-center">Units</th><th className="text-center">Open</th><th>Supplied</th><th>Status</th><th /></tr></thead>
              <tbody>
                {list.map(({ v, warehouses, offers, units, open, waiting, value, cities }) => (
                  <tr key={v.id}>
                    <td className="min-w-[230px]">
                      <Link href={`/admin/vendors/${v.id}`} className="flex items-center gap-3 group">
                        <Initials name={v.company} />
                        <span className="min-w-0"><span className="block font-bold text-navy group-hover:text-emerald truncate">{v.company}</span><span className="block text-[11.5px] text-charcoal/50 truncate">{v.type === 'house' ? 'Own stock' : `${v.name} · ${v.businessType}`}</span></span>
                      </Link>
                    </td>
                    <td className="min-w-[160px] text-charcoal/70">{warehouses.length} <span className="text-charcoal/45">· {cities.join(', ') || '—'}</span></td>
                    <td className="text-center font-semibold text-navy">{offers.length}</td>
                    <td className="text-center font-semibold text-navy">{units.toLocaleString()}</td>
                    <td className="text-center">{open ? <span className="font-bold text-navy">{open}</span> : <span className="text-charcoal/40">0</span>}{waiting > 0 && <span className="block text-[10.5px] font-bold text-[#8a6417]">{waiting} new</span>}</td>
                    <td className="whitespace-nowrap font-semibold text-navy">{money(value)}</td>
                    <td><Pill meta={SUPPLIER_STATUS[v.status]} /><span className="block text-[11px] text-charcoal/45 mt-0.5">since {fmtDate(v.createdAt)}</span></td>
                    <td className="text-right whitespace-nowrap">
                      {v.status === 'pending'
                        ? <button className="dash-btn dash-btn-navy !h-8 !px-3" onClick={() => { setUserStatus(v.id, 'active'); toast({ text: `${v.company} approved — orders will now route to them` }); }}><Check /> Approve</button>
                        : <Link href={`/admin/vendors/${v.id}`} className="dash-btn dash-btn-ghost !h-8 !px-3">Open</Link>}
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

export default function VendorsPage() {
  return <Suspense fallback={<Skeleton />}><Inner /></Suspense>;
}
