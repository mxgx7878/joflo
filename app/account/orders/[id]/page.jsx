'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Copy, Printer, RotateCcw, Truck, XCircle } from 'lucide-react';
import { useStore } from '@/lib/store';
import { productImg } from '@/lib/catalogue';
import { money, fmtDate, fmtDateTime, ORDER_FLOW, ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS } from '@/lib/format';
import { Pill, OrderProgress, Modal, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { AddressBlock, SectionCard, useMyOrders } from '@/components/account/shared';

export default function OrderDetail() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const orders = useMyOrders();
  const order = orders.find((o) => o.id === id);
  const products = useStore((s) => s.products);
  const { addToCart, cancelOrder } = useStore.getState();
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!order) {
    return <div className="dash-card"><EmptyState title="Order not found" body="This order doesn't exist or belongs to another account." action={<Link href="/account/orders" className="dash-btn dash-btn-navy">Back to my orders</Link>} /></div>;
  }

  const reorder = () => {
    let n = 0;
    order.items.forEach((it) => { const p = products.find((x) => x.id === it.productId); if (p && p.status === 'active' && typeof p.price === 'number' && addToCart(p.id, it.qty)) n++; });
    if (!n) { toast({ text: 'These items are quoted on request — send a new quote request instead.' }); return; }
    toast({ text: `${n} product${n === 1 ? '' : 's'} added to your cart` });
    router.push('/checkout');
  };

  const statusMeta = ORDER_STATUS[order.status];

  return (
    <div className="print-area">
      <Link href="/account/orders" className="no-print inline-flex items-center gap-2 text-[13px] font-bold text-navy hover:text-emerald mb-4"><ArrowLeft className="w-4 h-4" />All orders</Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <p className="kicker">{order.source === 'quote' ? `Order from quote ${order.inquiryId}` : 'Order'}</p>
          <div className="flex items-center gap-3 flex-wrap mt-2">
            <h1 className="h-display text-navy text-[1.9rem] sm:text-[2.3rem]">{order.id}</h1>
            <Pill meta={statusMeta} />
            <Pill meta={PAYMENT_STATUS[order.payment]} />
          </div>
          <p className="text-[13.5px] text-charcoal/60 mt-1.5">Placed {fmtDateTime(order.createdAt)} · {order.items.length} products · {money(order.total)}</p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          {order.status === 'pending' && <button type="button" onClick={() => setConfirmCancel(true)} className="dash-btn dash-btn-danger"><XCircle />Cancel order</button>}
          <button type="button" onClick={() => window.print()} className="dash-btn dash-btn-ghost"><Printer />Invoice</button>
          <button type="button" onClick={reorder} className="dash-btn dash-btn-navy"><RotateCcw />Reorder</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <div className="space-y-6">
          <SectionCard title="Delivery progress" className="no-print">
            <OrderProgress status={order.status} flow={ORDER_FLOW} />
            {order.tracking && (
              <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-ivory p-3.5">
                <Truck className="w-5 h-5 text-emerald" />
                <span className="text-[13px] text-charcoal/70">Tracking number</span>
                <span className="font-extrabold text-navy tracking-wide">{order.tracking}</span>
                <button type="button" onClick={() => { navigator.clipboard?.writeText(order.tracking); toast({ text: 'Tracking number copied' }); }} className="ml-auto text-[12px] font-bold text-emerald inline-flex items-center gap-1"><Copy className="w-3.5 h-3.5" />Copy</button>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Items" bodyClass="pt-3">
            <ul className="divide-y divide-navy/5">
              {order.items.map((it, i) => (
                <li key={i} className="flex items-center gap-4 px-5 sm:px-6 py-4">
                  <img src={productImg(it)} alt="" className="w-16 h-16 rounded-xl object-contain bg-ivory p-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-navy text-[14px] leading-snug">{it.name}</p>
                    {it.size && <p className="text-[12px] text-charcoal/50 mt-0.5">{it.size}</p>}
                    <p className="text-[12.5px] text-charcoal/65 mt-1">{it.qty} {it.unit && it.unit !== 'units' ? it.unit : ''} × {money(it.price)}</p>
                  </div>
                  <span className="font-extrabold text-navy">{money(it.qty * it.price)}</span>
                </li>
              ))}
            </ul>
            <dl className="px-5 sm:px-6 py-4 border-t border-navy/5 bg-ivory/50 space-y-1.5 text-[13.5px]">
              <div className="flex justify-between"><dt className="text-charcoal/60">Subtotal</dt><dd className="font-bold">{money(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-charcoal/60">Delivery</dt><dd className="font-bold">{order.shipping ? money(order.shipping) : 'Free'}</dd></div>
              <div className="flex justify-between pt-2 border-t border-navy/10 text-[16px]"><dt className="font-extrabold text-navy">Total</dt><dd className="font-extrabold text-navy">{money(order.total)} <span className="text-[11px] text-charcoal/45">USD</span></dd></div>
            </dl>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Details">
            <div className="space-y-5">
              <div><p className="dash-label">Delivery address</p><AddressBlock address={order.address} /></div>
              <div><p className="dash-label">Customer</p><p className="text-[13.5px] text-charcoal/80">{order.customer.name}{order.customer.company ? ` · ${order.customer.company}` : ''}<br />{order.customer.email}</p></div>
              <div><p className="dash-label">Payment</p><p className="text-[13.5px] text-charcoal/80">{PAYMENT_METHODS[order.paymentMethod]} · <span className={order.payment === 'paid' ? 'text-emerald font-bold' : 'text-[#B4432F] font-bold'}>{PAYMENT_STATUS[order.payment].label}</span></p></div>
              {order.notes && <div><p className="dash-label">Your notes</p><p className="text-[13.5px] text-charcoal/80">{order.notes}</p></div>}
              {order.inquiryId && <div className="no-print"><p className="dash-label">Quote</p><Link href={`/account/quotes/${order.inquiryId}`} className="text-[13.5px] font-bold text-emerald hover:text-navy">View quote {order.inquiryId}</Link></div>}
            </div>
          </SectionCard>
          <SectionCard title="Timeline" className="no-print">
            <ol className="relative border-l-2 border-navy/10 ml-2 space-y-5">
              {[...order.timeline].reverse().map((t, i) => (
                <li key={i} className="pl-5 relative">
                  <span className={`absolute -left-[9px] top-0.5 w-4 h-4 rounded-full grid place-items-center ${i === 0 ? (t.status === 'cancelled' ? 'bg-[#B4432F]' : 'bg-emerald') : 'bg-white border-2 border-navy/20'}`}>{i === 0 && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}</span>
                  <p className="text-[13.5px] font-extrabold text-navy">{ORDER_STATUS[t.status]?.label || t.status}</p>
                  <p className="text-[12px] text-charcoal/50">{fmtDateTime(t.at)}</p>
                  {t.note && <p className="text-[12.5px] text-charcoal/70 mt-0.5">{t.note}</p>}
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      </div>

      <p className="print-only text-[12px] text-charcoal/60 mt-6">JOLOF TRADING · Tax invoice / order summary · Printed {fmtDate(new Date().toISOString())}</p>

      <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} kicker="Cancel order" title={`Cancel ${order.id}?`}
        footer={<>
          <button type="button" className="dash-btn dash-btn-ghost" onClick={() => setConfirmCancel(false)}>Keep order</button>
          <button type="button" className="dash-btn dash-btn-danger" onClick={() => { cancelOrder(order.id); setConfirmCancel(false); toast({ text: `Order ${order.id} cancelled` }); }}>Yes, cancel order</button>
        </>}>
        <p className="text-[14px] text-charcoal/70">Orders can be cancelled while they're still pending. Stock will be released and no payment will be requested.</p>
      </Modal>

      <style>{`
        .print-only{ display:none; }
        @media print{
          aside, .no-print, nav, header, [role="status"] { display:none !important; }
          .print-only{ display:block; }
          body{ background:#fff !important; }
          main{ padding:0 !important; }
          .dash-card{ border-color:#ddd; break-inside:avoid; }
        }
      `}</style>
    </div>
  );
}
