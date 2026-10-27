'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { Inbox, Truck, Package, Boxes, ArrowRight, Warehouse, PackageX, MapPin } from 'lucide-react';
import { useStoreReady } from '@/lib/store';
import { money, fmtDate, sizeLine } from '@/lib/format';
import { getLocation, locationLabel, fmtKm } from '@/lib/locations';
import { FUL_STATUS } from '@/lib/fulfilment';
import { PageHeader, StatCard, Pill, EmptyState } from '@/components/ui';
import { Card, TableWrap, Thumb, Skeleton } from '@/components/admin/common';
import { useVendor, OPEN_JOB, totalStock } from '@/components/vendor/hooks';

export default function VendorOverview() {
  const ready = useStoreReady();
  const { me, warehouses, offers, jobs, products } = useVendor();

  const d = useMemo(() => {
    const live = jobs.filter((j) => j.status !== 'cancelled');
    const month = new Date();
    const monthValue = live.filter((j) => { const t = new Date(j.order.createdAt); return t.getMonth() === month.getMonth() && t.getFullYear() === month.getFullYear(); }).reduce((s, j) => s + j.value, 0);
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    const alerts = offers.map((o) => ({ o, p: byId[o.productId], n: totalStock(o) })).filter((x) => x.p && x.n <= Math.max(5, x.p.lowStock || 0)).sort((a, b) => a.n - b.n);
    const perWh = warehouses.map((w) => ({ w, units: offers.reduce((s, o) => s + (Number(o.stock?.[w.id]) || 0), 0), skus: offers.filter((o) => (o.stock?.[w.id] || 0) > 0).length }));
    return {
      newJobs: jobs.filter((j) => j.status === 'assigned'),
      toShip: jobs.filter((j) => ['accepted', 'packed'].includes(j.status)),
      open: jobs.filter((j) => OPEN_JOB.includes(j.status)),
      units: offers.reduce((s, o) => s + totalStock(o), 0),
      monthValue, alerts, perWh,
    };
  }, [jobs, offers, warehouses, products]);

  if (!ready || !me) return <Skeleton />;

  return (
    <>
      <PageHeader kicker={me.company} title={`Welcome, ${me.name.split(' ')[0]}`} sub="Orders are routed to the warehouse nearest the customer that has the stock. Keep your stock up to date so you get more orders." />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Inbox} label="New orders" value={d.newJobs.length} hint="Waiting for you to accept" tone="gold" href="/vendor/orders?status=assigned" />
        <StatCard icon={Truck} label="To ship" value={d.toShip.length} hint="Accepted or packed" href="/vendor/orders?status=open" />
        <StatCard icon={Package} label="Products listed" value={offers.length} hint={`${money(d.monthValue)} supplied this month`} tone="emerald" href="/vendor/products" />
        <StatCard icon={Boxes} label="Units in stock" value={d.units.toLocaleString()} hint={`Across ${warehouses.length} warehouse${warehouses.length === 1 ? '' : 's'}`} tone="ivory" href="/vendor/warehouses" />
      </div>

      <div className="mt-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5">
        <Card title="Orders needing action" action={<Link href="/vendor/orders" className="text-[12.5px] font-bold text-emerald hover:text-navy">All orders →</Link>} pad={false}>
          {d.open.length === 0 ? <EmptyState icon={Inbox} title="All caught up" body="New orders routed to your warehouses will appear here." /> : (
            <TableWrap>
              <table className="dash-table">
                <thead><tr><th>Order</th><th>Ship from</th><th>Deliver to</th><th>Units</th><th>Status</th><th className="text-right">Supply value</th></tr></thead>
                <tbody>
                  {d.open.slice(0, 8).map((j) => (
                    <tr key={j.order.id + j.key}>
                      <td className="whitespace-nowrap"><Link href={`/vendor/orders/${j.order.id}`} className="font-bold text-navy hover:text-emerald">{j.order.id}</Link><span className="block text-[11.5px] text-charcoal/50">{fmtDate(j.order.createdAt)}</span></td>
                      <td className="min-w-[150px]"><span className="font-semibold text-navy">{j.warehouse?.name}</span></td>
                      <td className="whitespace-nowrap text-charcoal/70">{locationLabel(j.order.location)}<span className="block text-[11.5px] text-charcoal/45">{fmtKm(j.distanceKm)}</span></td>
                      <td className="text-charcoal/70">{j.units}</td>
                      <td><Pill meta={FUL_STATUS[j.status]}>{j.status === 'assigned' ? 'New' : undefined}</Pill></td>
                      <td className="text-right font-bold text-navy">{money(j.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>

        <div className="space-y-5">
          <Card title="Warehouses" action={<Link href="/vendor/warehouses" className="text-[12.5px] font-bold text-emerald hover:text-navy">Manage →</Link>}>
            {d.perWh.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-[13.5px] text-charcoal/60">Add a warehouse so orders can be routed to you.</p>
                <Link href="/vendor/warehouses" className="dash-btn dash-btn-navy mt-3">Add warehouse <ArrowRight /></Link>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {d.perWh.map(({ w, units, skus }) => (
                  <li key={w.id} className="flex items-center gap-3 rounded-xl bg-ivory px-3 py-2.5">
                    <span className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${w.active ? 'bg-emerald text-white' : 'bg-navy/10 text-navy/50'}`}><Warehouse className="w-4 h-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-bold text-navy truncate">{w.name}</p>
                      <p className="text-[11.5px] text-charcoal/55 flex items-center gap-1"><MapPin className="w-3 h-3" />{locationLabel(getLocation(w.locationId))}{!w.active && ' · inactive'}</p>
                    </div>
                    <span className="text-right text-[12px] text-charcoal/60"><b className="text-navy text-[13.5px]">{units.toLocaleString()}</b><br />{skus} SKUs</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Low stock" action={<PackageX className="w-4 h-4 text-gold" />}>
            {d.alerts.length === 0 ? <p className="text-[13px] text-charcoal/55">Every listed product has healthy stock.</p> : (
              <ul className="-mx-1">
                {d.alerts.slice(0, 6).map(({ o, p, n }) => (
                  <li key={o.id} className="flex items-center gap-3 px-1 py-2 border-b border-navy/5 last:border-0">
                    <Thumb p={p} size="w-9 h-9" />
                    <div className="min-w-0 flex-1"><p className="text-[13px] font-bold text-navy truncate">{p.name}</p><p className="text-[11px] text-charcoal/50 truncate">{sizeLine(p)}</p></div>
                    <span className={`text-[13px] font-extrabold ${n === 0 ? 'text-[#B4432F]' : 'text-[#8a6417]'}`}>{n}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/vendor/products" className="mt-3 inline-block text-[12.5px] font-bold text-emerald hover:text-navy">Update stock →</Link>
          </Card>
        </div>
      </div>
    </>
  );
}
