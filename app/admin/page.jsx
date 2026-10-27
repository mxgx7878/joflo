'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { DollarSign, ShoppingCart, MessageSquareText, AlertTriangle, UserCheck, ArrowRight, Inbox, PackageX, Clock } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { money, fmtDate, timeAgo, ORDER_STATUS, INQUIRY_TYPE, stockState, STOCK_STATE } from '@/lib/format';
import { PageHeader, StatCard, Pill } from '@/components/ui';
import { Card, TableWrap, Thumb, Skeleton } from '@/components/admin/common';

const WEEK = 7 * 864e5;

export default function AdminOverview() {
  const ready = useStoreReady();
  const orders = useStore((s) => s.orders);
  const inquiries = useStore((s) => s.inquiries);
  const products = useStore((s) => s.products);
  const users = useStore((s) => s.users);

  const d = useMemo(() => {
    const now = new Date();
    const live = orders.filter((o) => o.status !== 'cancelled');
    const monthRev = live.filter((o) => { const t = new Date(o.createdAt); return t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear(); }).reduce((s, o) => s + o.total, 0);
    const toProcess = orders.filter((o) => ['pending', 'confirmed', 'packed'].includes(o.status));
    const newInq = inquiries.filter((i) => i.status === 'new');
    const low = products.filter((p) => p.status === 'active' && stockState(p) !== 'ok');
    const pendingUsers = users.filter((u) => u.role === 'customer' && u.status === 'pending');
    const pendingVendors = users.filter((u) => u.role === 'vendor' && u.status === 'pending');
    const unrouted = orders.filter((o) => o.status !== 'cancelled' && o.items.some((i) => i.productId && !i.warehouseId));
    // last 8 weeks (week ending today)
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const to = end.getTime() - (7 - i) * WEEK;
      const from = to - WEEK;
      const inW = live.filter((o) => { const t = new Date(o.createdAt).getTime(); return t > from && t <= to; });
      return { label: new Date(to).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }), revenue: Math.round(inW.reduce((s, o) => s + o.total, 0)), orders: inW.length };
    });
    const units = {};
    live.forEach((o) => o.items.forEach((i) => { if (i.productId) units[i.productId] = (units[i.productId] || 0) + i.qty; }));
    const top = Object.entries(units).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => ({ p: products.find((x) => x.id === id), n })).filter((x) => x.p);
    return { monthRev, toProcess, newInq, low, pendingUsers, pendingVendors, unrouted, weeks, top, recent: orders.slice(0, 6) };
  }, [orders, inquiries, products, users]);

  if (!ready) return <Skeleton />;

  const attention = [
    ...d.unrouted.map((o) => ({ icon: AlertTriangle, tone: 'text-[#B4432F]', title: `Order ${o.id} needs a supplier`, sub: `No warehouse near ${o.location?.city || 'the customer'} had the stock`, href: `/admin/orders/${o.id}` })),
    ...d.newInq.slice(0, 3).map((i) => ({ icon: Inbox, tone: 'text-gold', title: `${INQUIRY_TYPE[i.type]} from ${i.company || i.name}`, sub: timeAgo(i.createdAt), href: `/admin/inquiries/${i.id}` })),
    ...orders.filter((o) => o.status === 'pending').slice(0, 3).map((o) => ({ icon: Clock, tone: 'text-navy-600', title: `Order ${o.id} awaiting confirmation`, sub: `${o.customer.company || o.customer.name} · ${money(o.total)}`, href: `/admin/orders/${o.id}` })),
    ...d.low.slice(0, 3).map((p) => ({ icon: PackageX, tone: 'text-[#B4432F]', title: `${p.name} — ${STOCK_STATE[stockState(p)].label.toLowerCase()}`, sub: `${p.stock} on hand · alert at ${p.lowStock}`, href: '/admin/inventory?filter=attention' })),
    ...d.pendingUsers.map((u) => ({ icon: UserCheck, tone: 'text-emerald', title: `Retailer approval: ${u.company}`, sub: `${u.name} · registered ${timeAgo(u.createdAt)}`, href: `/admin/customers/${u.id}` })),
    ...d.pendingVendors.map((u) => ({ icon: UserCheck, tone: 'text-emerald', title: `Supplier approval: ${u.company}`, sub: `${u.businessType} · applied ${timeAgo(u.createdAt)}`, href: `/admin/vendors/${u.id}` })),
  ];

  return (
    <>
      <PageHeader kicker="Overview" title="Good day, here’s the store today" sub="Orders, inquiries and stock at a glance. Everything here updates live as customers use the storefront." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4">
        <StatCard icon={DollarSign} label="Revenue · month" value={money(d.monthRev)} hint="Excl. cancelled" tone="emerald" />
        <StatCard icon={ShoppingCart} label="To process" value={d.toProcess.length} hint="Orders not yet shipped" href="/admin/orders" />
        <StatCard icon={MessageSquareText} label="New inquiries" value={d.newInq.length} hint="Awaiting reply" tone="gold" href="/admin/inquiries" />
        <StatCard icon={AlertTriangle} label="Stock alerts" value={d.low.length} hint="Low or out" tone="ivory" href="/admin/inventory?filter=attention" />
        <StatCard icon={UserCheck} label="Approvals" value={d.pendingUsers.length + d.pendingVendors.length} hint={`${d.pendingUsers.length} retailers · ${d.pendingVendors.length} suppliers`} tone="ivory" href={d.pendingVendors.length && !d.pendingUsers.length ? '/admin/vendors?tab=pending' : '/admin/customers?tab=pending'} />
      </div>

      <div className="mt-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5">
        <Card title="Revenue & orders · last 8 weeks" action={<span className="flex items-center gap-4 text-[11.5px] font-bold text-charcoal/60"><span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-navy" />Revenue</span><span className="flex items-center gap-1.5"><i className="w-3 h-[2px] bg-gold" />Orders</span></span>}>
          <div className="h-[280px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={d.weeks} margin={{ top: 10, right: 6, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(11,35,71,.07)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'rgba(24,35,46,.55)' }} />
                <YAxis yAxisId="r" tickLine={false} axisLine={false} width={52} tick={{ fontSize: 11, fill: 'rgba(24,35,46,.55)' }} tickFormatter={(v) => `$${v}`} />
                <YAxis yAxisId="o" orientation="right" tickLine={false} axisLine={false} width={24} allowDecimals={false} tick={{ fontSize: 11, fill: 'rgba(24,35,46,.55)' }} />
                <Tooltip cursor={{ fill: 'rgba(201,154,46,.08)' }} contentStyle={{ borderRadius: 12, border: '1px solid rgba(11,35,71,.1)', fontSize: 12 }} formatter={(v, n) => (n === 'revenue' ? [money(v), 'Revenue'] : [v, 'Orders'])} />
                <Bar yAxisId="r" dataKey="revenue" fill="#0B2347" radius={[6, 6, 0, 0]} maxBarSize={38} />
                <Line yAxisId="o" dataKey="orders" stroke="#C99A2E" strokeWidth={2.5} dot={{ r: 3.5, fill: '#C99A2E', strokeWidth: 0 }} type="linear" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Needs attention" action={<span className="text-[12px] font-bold text-charcoal/50">{attention.length} items</span>}>
          {attention.length === 0 ? <p className="text-[13.5px] text-charcoal/60 py-6 text-center">All caught up.</p> : (
            <ul className="-mx-2 max-h-[290px] overflow-y-auto">
              {attention.map((a, i) => (
                <li key={i}>
                  <Link href={a.href} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-ivory transition group">
                    <span className={`w-9 h-9 rounded-full bg-ivory grid place-items-center shrink-0 ${a.tone}`}><a.icon className="w-4 h-4" /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-bold text-navy truncate">{a.title}</span>
                      <span className="block text-[11.5px] text-charcoal/55 truncate">{a.sub}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-navy/30 group-hover:text-emerald" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5">
        <Card title="Recent orders" action={<Link href="/admin/orders" className="text-[12.5px] font-bold text-emerald hover:text-navy">View all →</Link>} pad={false}>
          <TableWrap>
            <table className="dash-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {d.recent.map((o) => (
                  <tr key={o.id}>
                    <td className="whitespace-nowrap"><Link href={`/admin/orders/${o.id}`} className="font-bold text-navy hover:text-emerald">{o.id}</Link></td>
                    <td><span className="font-semibold text-navy">{o.customer.company || o.customer.name}</span><span className="block text-[11.5px] text-charcoal/50">{o.customer.name}</span></td>
                    <td className="whitespace-nowrap text-charcoal/70">{fmtDate(o.createdAt)}</td>
                    <td><Pill meta={ORDER_STATUS[o.status]} /></td>
                    <td className="text-right font-bold text-navy">{money(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>

        <Card title="Top products · units sold">
          <ul className="space-y-3">
            {d.top.map(({ p, n }, i) => {
              const max = d.top[0].n;
              return (
                <li key={p.id} className="flex items-center gap-3">
                  <Thumb p={p} size="w-10 h-10" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2"><p className="text-[13px] font-bold text-navy truncate">{p.name}</p><span className="text-[12.5px] font-extrabold text-navy">{n}</span></div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-navy/5"><div className={`h-full rounded-full ${i === 0 ? 'bg-gold' : 'bg-navy/70'}`} style={{ width: `${(n / max) * 100}%` }} /></div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}
