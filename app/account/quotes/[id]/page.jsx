'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, CreditCard, MessageSquareText, Ship, XCircle } from 'lucide-react';
import { useStore, quoteTotal } from '@/lib/store';
import { productImg } from '@/lib/catalogue';
import { money, fmtDate, fmtDateTime, INQUIRY_STATUS, INQUIRY_TYPE, qtyUnit } from '@/lib/format';
import { Pill, Modal, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { SectionCard, useMyInquiries } from '@/components/account/shared';

const STEPS = [
  { key: 'new', label: 'Request sent' },
  { key: 'in_review', label: 'In review' },
  { key: 'quoted', label: 'Quote sent' },
  { key: 'accepted', label: 'Paid & confirmed' },
];

export default function QuoteDetail() {
  const { id } = useParams();
  const toast = useToast();
  const inq = useMyInquiries().find((i) => i.id === id);
  const products = useStore((s) => s.products);
  const commodities = useStore((s) => s.commodities);
  const { declineQuote } = useStore.getState();
  const invoiceId = useStore((s) => s.invoices.find((v) => v.orderId === inq?.orderId)?.id);
  const [declining, setDeclining] = useState(false);

  if (!inq) return <div className="dash-card"><EmptyState title="Request not found" action={<Link href="/account/quotes" className="dash-btn dash-btn-navy">Back to quotes</Link>} /></div>;

  const q = inq.quote;
  const expired = q && inq.status === 'quoted' && new Date(q.validUntil + 'T23:59:59') < new Date();
  const stepIdx = inq.status === 'declined' || inq.status === 'closed' ? -1 : STEPS.findIndex((s) => s.key === inq.status);
  const imgFor = (item) => {
    if (item.productId) return productImg(products.find((p) => p.id === item.productId) || {});
    const c = commodities.find((x) => x.id === item.commodityId);
    return c?.img || '/brand/logo.webp';
  };

  const payHref = inq.payRequest?.token ? `/pay/${inq.payRequest.token}` : null;

  return (
    <>
      <Link href="/account/quotes" className="inline-flex items-center gap-2 text-[13px] font-bold text-navy hover:text-emerald mb-4"><ArrowLeft className="w-4 h-4" />All quotes & inquiries</Link>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <p className="kicker">{INQUIRY_TYPE[inq.type]}</p>
          <div className="flex items-center gap-3 flex-wrap mt-2">
            <h1 className="h-display text-navy text-[1.9rem] sm:text-[2.3rem]">{inq.id}</h1>
            <Pill meta={INQUIRY_STATUS[inq.status]} />
          </div>
          <p className="text-[13.5px] text-charcoal/60 mt-1.5">Sent {fmtDateTime(inq.createdAt)}{inq.dept ? ` · ${inq.dept}` : ''}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="dash-card p-5 sm:p-6 mb-6">
        {stepIdx === -1 ? (
          <p className="text-[13.5px] font-bold text-charcoal/60">{inq.status === 'declined' ? 'You declined this quote.' : 'This inquiry has been closed by our team.'}</p>
        ) : (
          <ol className="grid grid-cols-4 gap-2">
            {STEPS.map((s, i) => (
              <li key={s.key}>
                <div className={`h-1.5 rounded-full ${i <= stepIdx ? 'bg-emerald' : 'bg-navy/10'}`} />
                <p className={`mt-2 text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-[.08em] ${i <= stepIdx ? 'text-emerald' : 'text-charcoal/40'}`}>{s.label}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <div className="space-y-6">
          {q ? (
            <section className={`dash-card overflow-hidden ${inq.status === 'quoted' ? 'ring-2 ring-gold/50' : ''}`}>
              <div className="px-5 sm:px-6 pt-5 pb-4 flex flex-wrap items-start justify-between gap-3 border-b border-navy/5">
                <div>
                  <p className="text-[10.5px] font-extrabold tracking-[.2em] uppercase text-gold">Quote from JOLOF TRADING</p>
                  <h2 className="font-display text-[1.4rem] text-navy">Your quotation</h2>
                  <p className="text-[12.5px] text-charcoal/55 mt-0.5">Sent {fmtDateTime(q.sentAt)}</p>
                </div>
                <div className={`rounded-xl px-3.5 py-2 text-right ${expired ? 'bg-[#F8E7E3] text-[#B4432F]' : 'bg-ivory text-navy'}`}>
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[.14em] opacity-70">{expired ? 'Expired' : 'Valid until'}</p>
                  <p className="font-extrabold text-[14px]">{fmtDate(q.validUntil)}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="dash-table">
                  <thead><tr><th>Item</th><th className="!text-right">Qty</th><th className="!text-right hidden sm:table-cell">Unit price</th><th className="!text-right">Line total</th></tr></thead>
                  <tbody>
                    {q.lines.map((l, i) => (
                      <tr key={i}>
                        <td><p className="font-bold text-navy">{l.name}</p>{l.size && <p className="text-[11.5px] text-charcoal/50">{l.size}</p>}<p className="sm:hidden text-[11.5px] text-charcoal/60 mt-0.5">{money(l.unitPrice)} each</p></td>
                        <td className="text-right whitespace-nowrap">{qtyUnit(l.qty, l.unit)}</td>
                        <td className="text-right whitespace-nowrap hidden sm:table-cell">{money(l.unitPrice)}</td>
                        <td className="text-right font-extrabold text-navy whitespace-nowrap">{money(l.qty * l.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <dl className="px-5 sm:px-6 py-4 bg-ivory/50 space-y-1.5 text-[13.5px] border-t border-navy/5">
                <div className="flex justify-between"><dt className="text-charcoal/60">Delivery{q.deliveryMiles ? ` · ~${Math.round(q.deliveryMiles)} mi` : ''}</dt><dd className="font-bold">{Number(q.shipping) ? money(Number(q.shipping)) : 'Included'}</dd></div>
                {Number(q.discount) > 0 && <div className="flex justify-between"><dt className="text-charcoal/60">Discount</dt><dd className="font-bold">−{money(Number(q.discount))}</dd></div>}
                <div className="flex justify-between pt-2 border-t border-navy/10 text-[17px]"><dt className="font-extrabold text-navy">Quote total</dt><dd className="font-extrabold text-navy">{money(quoteTotal(q))} <span className="text-[11px] text-charcoal/45">USD</span></dd></div>
              </dl>
              {q.note && <div className="px-5 sm:px-6 py-4 border-t border-navy/5 flex gap-3 text-[13.5px] text-charcoal/75"><MessageSquareText className="w-4 h-4 text-gold shrink-0 mt-0.5" /><p>{q.note}</p></div>}

              {inq.status === 'quoted' && (
                <div className="px-5 sm:px-6 py-5 border-t border-navy/5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <p className="text-[12.5px] text-charcoal/60">{expired ? 'This quote has expired — send a new request for updated pricing.' : !payHref ? 'Our team is updating this quote — check your email for the latest link.' : 'Paying by card confirms the order at these prices and issues your invoice. We also emailed you this link.'}</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setDeclining(true)} className="dash-btn dash-btn-ghost"><XCircle />Decline</button>
                    {payHref && !expired
                      ? <Link href={payHref} className="dash-btn dash-btn-gold"><CreditCard />Review & pay {money(quoteTotal(q))}</Link>
                      : <button type="button" disabled className="dash-btn dash-btn-gold"><CreditCard />Review & pay</button>}
                  </div>
                </div>
              )}
              {inq.status === 'accepted' && inq.orderId && (
                <div className="px-5 sm:px-6 py-4 border-t border-navy/5 bg-[#F2F8F5] flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[13.5px] font-bold text-emerald flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Accepted — converted to order {inq.orderId}</p>
                  <div className="flex gap-2">
                    {invoiceId && <Link href={`/account/invoices/${invoiceId}`} className="dash-btn dash-btn-ghost">Invoice</Link>}
                    <Link href={`/account/orders/${inq.orderId}`} className="dash-btn dash-btn-navy">View order <ArrowRight /></Link>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <div className="dash-card p-6 flex gap-4 items-start">
              <span className="w-11 h-11 rounded-xl bg-gold-pale text-gold grid place-items-center shrink-0"><Clock3 className="w-5 h-5" /></span>
              <div>
                <p className="font-display text-[1.3rem] text-navy">{inq.status === 'closed' ? 'Closed' : 'Our team is preparing your quote'}</p>
                <p className="text-[13.5px] text-charcoal/60 mt-1">{inq.status === 'closed' ? 'We replied to this inquiry by email.' : 'We usually reply within one business day. We\'ll email you the quote with a secure link to pay, and it will show here too.'}</p>
              </div>
            </div>
          )}

          <SectionCard title="What you asked for">
            {inq.items.length > 0 && (
              <ul className="divide-y divide-navy/5 -mt-2 mb-4">
                {inq.items.map((it, i) => (
                  <li key={i} className="flex items-center gap-3 py-3">
                    <img src={imgFor(it)} alt="" className="w-12 h-12 rounded-lg object-cover bg-ivory shrink-0" />
                    <p className="flex-1 font-bold text-navy text-[13.5px]">{it.name}</p>
                    <span className="text-[13px] font-extrabold text-navy whitespace-nowrap">{qtyUnit(it.qty, it.unit)}</span>
                  </li>
                ))}
              </ul>
            )}
            {inq.trade && (
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[['Incoterm', inq.trade.incoterm], ['Delivery port', inq.trade.port], ['Frequency', inq.trade.frequency], ['Target price', inq.trade.targetPrice ? `${money(Number(inq.trade.targetPrice))}/MT` : '—']].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-ivory p-3"><dt className="text-[10.5px] font-extrabold uppercase tracking-[.12em] text-charcoal/50 flex items-center gap-1">{k === 'Incoterm' && <Ship className="w-3 h-3" />}{k}</dt><dd className="font-bold text-navy text-[13.5px] mt-0.5">{v || '—'}</dd></div>
                ))}
              </dl>
            )}
            {inq.message && <blockquote className="rounded-xl border-l-[3px] border-gold bg-ivory/70 px-4 py-3 text-[13.5px] text-charcoal/75">{inq.message}</blockquote>}
          </SectionCard>
        </div>

        <SectionCard title="Contact details">
          <dl className="space-y-3 text-[13.5px]">
            {[['Name', inq.name], ['Company', inq.company], ['Email', inq.email], ['Phone', inq.phone]].filter(([, v]) => v).map(([k, v]) => (
              <div key={k}><dt className="dash-label !mb-0.5">{k}</dt><dd className="text-charcoal/80 break-words">{v}</dd></div>
            ))}
          </dl>
          <Link href="/account/quotes/new" className="dash-btn dash-btn-ghost w-full mt-5">Send another request</Link>
        </SectionCard>
      </div>

      <Modal open={declining} onClose={() => setDeclining(false)} kicker="Decline quote" title="Decline this quote?"
        footer={<>
          <button type="button" className="dash-btn dash-btn-ghost" onClick={() => setDeclining(false)}>Go back</button>
          <button type="button" className="dash-btn dash-btn-danger" onClick={async () => { setDeclining(false); const r = await declineQuote(inq.id); if (r.ok) toast({ text: `Quote ${inq.id} declined` }); }}>Decline quote</button>
        </>}>
        <p className="text-[14px] text-charcoal/70">We'll let our team know. You can always send a new request for updated pricing.</p>
      </Modal>
    </>
  );
}
