'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Mail, Phone, Building2, MapPin, UserX, Check, Users } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { money, fmtDate, ORDER_STATUS, INQUIRY_STATUS, INQUIRY_TYPE, USER_STATUS } from '@/lib/format';
import { Pill, StatCard, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Card, KV, TableWrap, Skeleton, Initials, useConfirm } from '@/components/admin/common';
import { DollarSign, ShoppingCart, MessageSquareText } from 'lucide-react';

export default function CustomerDetail() {
  const { id } = useParams();
  const ready = useStoreReady();
  const u = useStore((s) => s.users.find((x) => x.id === id));
  const allOrders = useStore((s) => s.orders);
  const allInq = useStore((s) => s.inquiries);
  const setUserStatus = useStore((s) => s.setUserStatus);
  const toast = useToast();
  const [ask, dialog] = useConfirm();

  const orders = useMemo(() => allOrders.filter((o) => o.userId === id), [allOrders, id]);
  const inquiries = useMemo(() => (u ? allInq.filter((i) => i.userId === id || i.email.toLowerCase() === u.email.toLowerCase()) : []), [allInq, id, u]);

  if (!ready) return <Skeleton />;
  if (!u || u.role !== 'customer') return <EmptyState icon={Users} title="Customer not found" action={<Link href="/admin/customers" className="dash-btn dash-btn-navy">Back to customers</Link>} />;

  const ltv = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const set = (status, msg) => { setUserStatus(u.id, status); toast({ text: msg }); };

  return (
    <>
      {dialog}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-charcoal/60 hover:text-navy"><ArrowLeft className="w-4 h-4" /> Customers</Link>
          <div className="flex items-center gap-4 mt-3">
            <Initials name={u.name} className={`w-14 h-14 text-[16px] ${u.type === 'retailer' ? '!bg-emerald' : ''}`} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="h-display text-navy text-[1.9rem]">{u.company || u.name}</h1>
                <Pill meta={USER_STATUS[u.status]} />
              </div>
              <p className="text-[13px] text-charcoal/55">{u.type === 'retailer' ? `Retailer · ${u.name}` : 'Individual customer'} · joined {fmtDate(u.createdAt)}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {u.status === 'pending' && <><button className="dash-btn dash-btn-navy" onClick={() => set('active', 'Retailer approved')}><Check /> Approve retailer</button><button className="dash-btn dash-btn-danger" onClick={() => set('suspended', 'Application rejected')}>Reject</button></>}
          {u.status === 'active' && <button className="dash-btn dash-btn-danger" onClick={() => ask({ title: `Suspend ${u.company || u.name}?`, body: 'They will not be able to sign in until reactivated.', confirm: 'Suspend', danger: true }, () => set('suspended', 'Account suspended'))}><UserX /> Suspend</button>}
          {u.status === 'suspended' && <button className="dash-btn dash-btn-navy" onClick={() => set('active', 'Account reactivated')}>Reactivate</button>}
          <a href={`mailto:${u.email}`} className="dash-btn dash-btn-ghost"><Mail /> Email</a>
        </div>
      </div>

      {u.status === 'pending' && <div className="mb-5 rounded-2xl bg-gold-pale/60 border border-gold/20 p-4 text-[13.5px] text-[#6d4f12]"><b>Awaiting approval.</b> Check the business details below, then approve so they can place wholesale orders.</div>}

      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <StatCard icon={DollarSign} label="Lifetime value" value={money(ltv)} tone="emerald" />
        <StatCard icon={ShoppingCart} label="Orders" value={orders.length} />
        <StatCard icon={MessageSquareText} label="Inquiries" value={inquiries.length} tone="gold" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-5">
        <div className="space-y-5">
          <Card title="Contact">
            <div className="space-y-2 text-[13.5px] text-charcoal/80">
              <p className="flex items-center gap-2 break-all"><Mail className="w-4 h-4 text-navy/40 shrink-0" />{u.email}</p>
              {u.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-navy/40" />{u.phone}</p>}
            </div>
          </Card>
          {u.type === 'retailer' && (
            <Card title="Business" action={<Building2 className="w-4 h-4 text-gold" />}>
              <KV k="Business name" v={u.company} />
              <KV k="EIN / Tax ID" v={u.abn} />
              <KV k="Business type" v={u.businessType} />
            </Card>
          )}
          <Card title={`Addresses (${u.addresses.length})`}>
            {u.addresses.length === 0 ? <p className="text-[13px] text-charcoal/50">No saved addresses.</p> : (
              <ul className="space-y-3">
                {u.addresses.map((a) => (
                  <li key={a.id} className="flex gap-2 text-[13px] text-charcoal/80"><MapPin className="w-4 h-4 mt-0.5 text-navy/40 shrink-0" />
                    <span><b className="text-navy">{a.label}</b>{a.isDefault && <span className="ml-2 pill bg-ivory text-charcoal/60 !py-0.5">Default</span>}<br />{a.line1}, {a.city} {a.state} {a.postcode}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-5 min-w-0">
          <Card title="Orders" pad={false}>
            {orders.length === 0 ? <p className="px-5 pb-5 text-[13px] text-charcoal/50">No orders yet.</p> : (
              <TableWrap>
                <table className="dash-table">
                  <thead><tr><th>Order</th><th>Date</th><th>Status</th><th className="text-right">Total</th></tr></thead>
                  <tbody>{orders.map((o) => (
                    <tr key={o.id}><td className="whitespace-nowrap"><Link href={`/admin/orders/${o.id}`} className="font-bold text-navy hover:text-emerald">{o.id}</Link></td><td className="text-charcoal/70 whitespace-nowrap">{fmtDate(o.createdAt)}</td><td><Pill meta={ORDER_STATUS[o.status]} /></td><td className="text-right font-bold text-navy">{money(o.total)}</td></tr>
                  ))}</tbody>
                </table>
              </TableWrap>
            )}
          </Card>
          <Card title="Inquiries & quotes" pad={false}>
            {inquiries.length === 0 ? <p className="px-5 pb-5 text-[13px] text-charcoal/50">No inquiries yet.</p> : (
              <TableWrap>
                <table className="dash-table">
                  <thead><tr><th>Inquiry</th><th>Type</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>{inquiries.map((i) => (
                    <tr key={i.id}><td><Link href={`/admin/inquiries/${i.id}`} className="font-bold text-navy hover:text-emerald">{i.id}</Link></td><td className="text-charcoal/70 whitespace-nowrap">{INQUIRY_TYPE[i.type]}</td><td className="text-charcoal/70 whitespace-nowrap">{fmtDate(i.createdAt)}</td><td><Pill meta={INQUIRY_STATUS[i.status]} /></td></tr>
                  ))}</tbody>
                </table>
              </TableWrap>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
