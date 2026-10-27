'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Printer, Truck, MapPin, User, FileText, CheckCircle2, Circle } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { money, fmtDate, fmtDateTime, ORDER_STATUS, ORDER_FLOW, PAYMENT_STATUS, PAYMENT_METHODS } from '@/lib/format';
import { productImg } from '@/lib/catalogue';
import { Pill, OrderProgress, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Card, KV, Skeleton, useConfirm, Initials } from '@/components/admin/common';

export default function OrderDetail() {
  const { id } = useParams();
  const ready = useStoreReady();
  const order = useStore((s) => s.orders.find((o) => o.id === id));
  const users = useStore((s) => s.users);
  const updateOrderStatus = useStore((s) => s.updateOrderStatus);
  const setOrderPayment = useStore((s) => s.setOrderPayment);
  const setOrderTracking = useStore((s) => s.setOrderTracking);
  const toast = useToast();
  const [ask, dialog] = useConfirm();
  const [note, setNote] = useState('');
  const [tracking, setTracking] = useState('');
  useEffect(() => { if (order) setTracking(order.tracking || ''); }, [order?.id]); // eslint-disable-line

  if (!ready) return <Skeleton />;
  if (!order) return <EmptyState icon={FileText} title="Order not found" body={`We couldn't find ${id}.`} action={<Link href="/admin/orders" className="dash-btn dash-btn-navy">Back to orders</Link>} />;

  const idx = ORDER_FLOW.indexOf(order.status);
  const next = idx > -1 && idx < ORDER_FLOW.length - 1 ? ORDER_FLOW[idx + 1] : null;
  const customer = users.find((u) => u.id === order.userId);
  const done = ['delivered', 'cancelled'].includes(order.status);

  const move = (status) => {
    const run = () => {
      if (status === 'shipped' && tracking && tracking !== order.tracking) setOrderTracking(order.id, tracking);
      updateOrderStatus(order.id, status, note.trim());
      setNote('');
      toast({ text: `${order.id} marked as ${ORDER_STATUS[status].label.toLowerCase()}` });
    };
    if (status === 'cancelled') ask({ title: `Cancel ${order.id}?`, body: 'Items will be returned to stock and the customer will see the order as cancelled.', confirm: 'Cancel order', danger: true }, run);
    else run();
  };

  return (
    <div className="print:p-0">
      {dialog}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-charcoal/60 hover:text-navy"><ArrowLeft className="w-4 h-4" /> Orders</Link>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <h1 className="h-display text-navy text-[2rem]">{order.id}</h1>
            <Pill meta={ORDER_STATUS[order.status]} />
            <Pill meta={PAYMENT_STATUS[order.payment]} />
            {order.source === 'quote' && <span className="pill bg-[#EEE9F8] text-[#5B3FA0]">From quote</span>}
          </div>
          <p className="text-[13px] text-charcoal/55 mt-1">Placed {fmtDateTime(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="dash-btn dash-btn-ghost" onClick={() => window.print()}><Printer /> Packing slip</button>
          {next && <button className="dash-btn dash-btn-navy" onClick={() => move(next)}>Mark as {ORDER_STATUS[next].label} <ArrowRight /></button>}
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:flex items-center justify-between mb-6">
        <img src="/brand/logo.webp" alt="" className="h-16" />
        <div className="text-right"><p className="font-display text-2xl text-navy">Packing slip</p><p className="text-sm">{order.id} · {fmtDate(order.createdAt)}</p></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
        <div className="space-y-5 min-w-0">
          <Card title="Progress" className="print:hidden"><OrderProgress status={order.status} flow={ORDER_FLOW} /></Card>

          <Card title={`Items (${order.items.length})`} pad={false}>
            <ul className="divide-y divide-navy/5">
              {order.items.map((i, k) => (
                <li key={k} className="flex items-center gap-4 px-5 py-3.5">
                  <img src={i.img ? productImg({ img: i.img }) : '/brand/logo.webp'} alt="" className="w-14 h-14 rounded-xl object-contain bg-ivory border border-navy/5 p-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-navy text-[14px] truncate">{i.name}</p>
                    <p className="text-[12px] text-charcoal/55">{i.size}{i.unit ? ` · per ${i.unit}` : ''}</p>
                  </div>
                  <p className="text-[13px] text-charcoal/65 whitespace-nowrap">{i.qty} × {money(i.price)}</p>
                  <p className="w-24 text-right font-extrabold text-navy">{money(i.qty * i.price)}</p>
                </li>
              ))}
            </ul>
            <div className="px-5 py-4 border-t border-navy/5 bg-ivory/50 rounded-b-[20px]">
              <div className="ml-auto max-w-[280px]">
                <KV k="Subtotal" v={money(order.subtotal)} />
                <KV k="Shipping" v={order.shipping ? money(order.shipping) : 'Free'} />
                <div className="flex justify-between pt-2 mt-1 border-t border-navy/10"><span className="font-bold text-navy">Total</span><span className="text-lg font-extrabold text-navy">{money(order.total)}</span></div>
              </div>
            </div>
          </Card>

          <Card title="Timeline" className="print:hidden">
            <ol className="relative">
              {[...order.timeline].reverse().map((t, k) => (
                <li key={k} className="flex gap-3 pb-4 last:pb-0">
                  <span className="mt-0.5">{k === 0 ? <CheckCircle2 className="w-5 h-5 text-emerald" /> : <Circle className="w-5 h-5 text-navy/20" />}</span>
                  <div>
                    <p className="text-[13.5px] font-bold text-navy">{ORDER_STATUS[t.status]?.label || t.status}</p>
                    <p className="text-[12px] text-charcoal/50">{fmtDateTime(t.at)}</p>
                    {t.note && <p className="text-[13px] text-charcoal/70 mt-1">{t.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-5">
          {!done && (
            <Card title="Update order" className="print:hidden">
              <label className="dash-label">Set status</label>
              <select className="dash-input" value={order.status} onChange={(e) => move(e.target.value)}>
                {[...ORDER_FLOW, 'cancelled'].map((s) => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
              </select>
              <label className="dash-label mt-4">Note for timeline (optional)</label>
              <input className="dash-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Dispatched with Australia Post" />
              <label className="dash-label mt-4">Tracking number</label>
              <div className="flex gap-2">
                <input className="dash-input" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="AUP…" />
                <button className="dash-btn dash-btn-ghost shrink-0" onClick={() => { setOrderTracking(order.id, tracking.trim()); toast({ text: 'Tracking number saved' }); }}><Truck /> Save</button>
              </div>
              {next && <button className="dash-btn dash-btn-navy w-full mt-4" onClick={() => move(next)}>Mark as {ORDER_STATUS[next].label} <ArrowRight /></button>}
              <button className="dash-btn dash-btn-danger w-full mt-2" onClick={() => move('cancelled')}>Cancel order</button>
            </Card>
          )}

          <Card title="Payment" className="print:hidden">
            <KV k="Method" v={PAYMENT_METHODS[order.paymentMethod]} />
            <KV k="Status" v={<Pill meta={PAYMENT_STATUS[order.payment]} />} />
            <button className="dash-btn dash-btn-ghost w-full mt-3" onClick={() => { const p = order.payment === 'paid' ? 'unpaid' : 'paid'; setOrderPayment(order.id, p); toast({ text: `Payment marked as ${p}` }); }}>
              Mark as {order.payment === 'paid' ? 'unpaid' : 'paid'}
            </button>
          </Card>

          <Card title="Customer">
            <div className="flex items-center gap-3">
              <Initials name={order.customer.name} className="w-11 h-11 text-[13px]" />
              <div className="min-w-0">
                <p className="font-bold text-navy truncate">{order.customer.company || order.customer.name}</p>
                <p className="text-[12.5px] text-charcoal/55 truncate">{order.customer.company ? order.customer.name : 'Individual'}</p>
              </div>
            </div>
            <div className="mt-3 text-[13px] space-y-1 text-charcoal/75">
              <p className="flex items-center gap-2"><User className="w-4 h-4 text-navy/40" />{order.customer.email}</p>
              {order.customer.phone && <p className="flex items-center gap-2"><User className="w-4 h-4 text-transparent" />{order.customer.phone}</p>}
            </div>
            {customer && <Link href={`/admin/customers/${customer.id}`} className="mt-3 inline-block text-[12.5px] font-bold text-emerald hover:text-navy print:hidden">View customer →</Link>}
          </Card>

          <Card title="Delivery">
            {order.address ? (
              <p className="flex gap-2 text-[13.5px] text-charcoal/80 leading-relaxed"><MapPin className="w-4 h-4 mt-0.5 text-navy/40 shrink-0" />
                <span>{order.address.label && <b className="text-navy">{order.address.label}<br /></b>}{order.address.line1}<br />{order.address.city} {order.address.state} {order.address.postcode}<br />{order.address.country}</span>
              </p>
            ) : <p className="text-[13px] text-charcoal/55">No address on file.</p>}
            {order.tracking && <p className="mt-3 text-[13px]"><span className="text-charcoal/55">Tracking:</span> <b className="text-navy">{order.tracking}</b></p>}
            {order.notes && <p className="mt-3 text-[13px] bg-ivory rounded-xl p-3"><b className="text-navy">Customer note:</b> {order.notes}</p>}
          </Card>

          {order.inquiryId && (
            <Card title="Source" className="print:hidden">
              <p className="text-[13px] text-charcoal/70">Created when the customer accepted quote <b className="text-navy">{order.inquiryId}</b>.</p>
              <Link href={`/admin/inquiries/${order.inquiryId}`} className="mt-2 inline-block text-[12.5px] font-bold text-emerald hover:text-navy">Open inquiry →</Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
