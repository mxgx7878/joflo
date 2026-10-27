'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Check, Landmark, PackageCheck, Truck, MailCheck } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { money, PAYMENT_METHODS, fmtDateTime } from '@/lib/format';
import { productImg } from '@/lib/catalogue';
import { MinimalHeader, AddressBlock, PageLoader } from '@/components/account/shared';

function Success() {
  const id = useSearchParams().get('order');
  const ready = useStoreReady();
  const order = useStore((s) => s.orders.find((o) => o.id === id));
  if (!ready) return <PageLoader />;
  if (!order) {
    return (
      <div className="dash-card text-center py-16 px-6">
        <p className="font-display text-2xl text-navy">Order not found</p>
        <Link href="/account/orders" className="btn btn-navy mt-6">View my orders</Link>
      </div>
    );
  }
  const steps = [
    { icon: MailCheck, t: 'Order received', d: 'We\'ve emailed a confirmation to ' + order.customer.email },
    { icon: PackageCheck, t: 'We confirm & pack', d: 'Our team checks stock and confirms within one business day.' },
    { icon: Truck, t: 'Dispatched', d: 'You\'ll get a tracking number in your account once shipped.' },
  ];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
      <div className="space-y-5">
        <div className="dash-card p-6 sm:p-9 relative overflow-hidden">
          <span className="w-16 h-16 rounded-full bg-emerald text-white grid place-items-center shadow-[0_14px_30px_-12px_rgba(7,86,60,.7)]"><Check className="w-8 h-8" strokeWidth={2.4} /></span>
          <p className="kicker mt-6">Thank you, {order.customer.name.split(' ')[0]}</p>
          <h1 className="h-display text-navy text-[2rem] sm:text-[2.6rem] mt-2">Your order is placed.</h1>
          <p className="text-[15px] text-charcoal/65 mt-3">Order <b className="text-navy">{order.id}</b> · {fmtDateTime(order.createdAt)} · {money(order.total)}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={`/account/orders/${order.id}`} className="btn btn-navy">Track this order <ArrowRight className="mv" /></Link>
            <Link href="/" className="btn btn-line-dark">Continue shopping</Link>
          </div>
        </div>

        <div className="dash-card p-6 sm:p-7">
          <h2 className="font-display text-[1.35rem] text-navy">What happens next</h2>
          <ol className="mt-5 grid sm:grid-cols-3 gap-4">
            {steps.map(({ icon: Icon, t, d }, i) => (
              <li key={t} className="rounded-2xl bg-ivory p-4">
                <span className={`w-10 h-10 rounded-xl grid place-items-center ${i === 0 ? 'bg-emerald text-white' : 'bg-white text-navy'}`}><Icon className="w-5 h-5" strokeWidth={1.8} /></span>
                <p className="font-extrabold text-navy text-[14px] mt-3">{t}</p>
                <p className="text-[12.5px] text-charcoal/60 mt-1">{d}</p>
              </li>
            ))}
          </ol>
        </div>

        {order.paymentMethod === 'bank_transfer' && (
          <div className="dash-card p-6 sm:p-7 border-gold/40 bg-gold-pale/40">
            <div className="flex items-center gap-3"><Landmark className="w-5 h-5 text-gold" /><h2 className="font-display text-[1.35rem] text-navy">Bank transfer details</h2></div>
            <dl className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-3 text-[13.5px]">
              {[['Account name', 'JOLOF TRADING'], ['Bank', 'To be confirmed by JOLOF TRADING'], ['BSB / Sort code', '— — —'], ['Account no.', '— — — —'], ['Reference', order.id], ['Amount', money(order.total) + ' USD']].map(([k, v]) => (
                <div key={k}><dt className="text-[11px] font-extrabold uppercase tracking-[.14em] text-charcoal/50">{k}</dt><dd className="font-bold text-navy mt-0.5">{v}</dd></div>
              ))}
            </dl>
            <p className="text-[12px] text-charcoal/55 mt-4">Please wait for stock confirmation before paying. Use your order number as the payment reference.</p>
          </div>
        )}
      </div>

      <aside className="dash-card overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-navy/5"><h2 className="font-display text-[1.3rem] text-navy">Order {order.id}</h2></div>
        <ul className="divide-y divide-navy/5">
          {order.items.map((it) => (
            <li key={it.productId || it.name} className="flex gap-3 px-6 py-3.5">
              <img src={productImg(it)} alt="" className="w-12 h-12 rounded-lg object-contain bg-ivory p-1 shrink-0" />
              <div className="flex-1 min-w-0"><p className="text-[13px] font-bold text-navy truncate">{it.name}</p><p className="text-[11.5px] text-charcoal/50">Qty {it.qty} × {money(it.price)}</p></div>
              <span className="text-[13px] font-extrabold text-navy">{money(it.qty * it.price)}</span>
            </li>
          ))}
        </ul>
        <dl className="px-6 py-4 space-y-1.5 text-[13.5px] bg-ivory/50 border-t border-navy/5">
          <div className="flex justify-between"><dt className="text-charcoal/60">Subtotal</dt><dd className="font-bold">{money(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-charcoal/60">Delivery</dt><dd className="font-bold">{order.shipping ? money(order.shipping) : 'Free'}</dd></div>
          <div className="flex justify-between pt-2 border-t border-navy/10 text-[15px]"><dt className="font-extrabold text-navy">Total</dt><dd className="font-extrabold text-navy">{money(order.total)}</dd></div>
        </dl>
        <div className="px-6 py-5 grid grid-cols-2 gap-4 border-t border-navy/5">
          <div><p className="dash-label">Deliver to</p><AddressBlock address={order.address} /></div>
          <div><p className="dash-label">Payment</p><p className="text-[13.5px] text-charcoal/80">{PAYMENT_METHODS[order.paymentMethod]}</p></div>
        </div>
      </aside>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-ivory">
      <MinimalHeader />
      <main className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <Suspense fallback={<PageLoader />}><Success /></Suspense>
      </main>
    </div>
  );
}
