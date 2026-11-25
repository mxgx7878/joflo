'use client';
// Private payment link: /pay/<token>. Used for quotes (pay to accept → order confirmed) and for
// the extra balance on a card order. No sign-in needed — the link is the secret.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, Banknote, CheckCircle2, Clock3, CreditCard, FileText, Lock, MapPin, MessageSquareText, XCircle } from 'lucide-react';
import { money, fmtDate, fmtDateTime, qtyUnit } from '@/lib/format';
import { STATES } from '@/lib/locations';
import { useStore } from '@/lib/store';
import { MinimalHeader } from '@/components/account/shared';
import { FullPageLoader, BusyOverlay } from '@/components/Loading';
import SquareCardForm from '@/components/checkout/SquareCardForm';

function Lines({ lines }) {
  return (
    <ul className="divide-y divide-navy/5 border-y border-navy/5">
      {lines.map((l, i) => (
        <li key={i} className="flex items-start justify-between gap-4 py-3 text-[14px]">
          <div className="min-w-0">
            <p className="font-bold text-navy leading-snug">{l.name}</p>
            <p className="text-[12px] text-charcoal/55">{[l.size, `${qtyUnit(l.qty, l.unit)} × ${l.price == null ? 'TBC' : money(l.price)}`].filter(Boolean).join(' · ')}</p>
          </div>
          <span className="font-extrabold text-navy whitespace-nowrap">{l.price == null ? '—' : money(l.qty * l.price)}</span>
        </li>
      ))}
    </ul>
  );
}

const Row = ({ k, v, strong, plain }) => (
  <div className={`flex justify-between ${strong ? `${plain ? '' : 'pt-2 mt-1 border-t border-navy/10 '}text-[17px]` : 'text-[13.5px]'}`}>
    <dt className={strong ? 'font-extrabold text-navy' : 'text-charcoal/60'}>{k}</dt>
    <dd className={strong ? 'font-extrabold text-navy' : 'font-bold text-navy'}>{v}</dd>
  </div>
);

export default function PayPage() {
  const { token } = useParams();
  const me = useStore((s) => s.me);
  const [page, setPage] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [addr, setAddr] = useState({ line1: '', city: '', state: '', postcode: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [doneOrder, setDoneOrder] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch(`/api/pay/${encodeURIComponent(token)}`, { credentials: 'same-origin' });
        const j = await r.json();
        if (!live) return;
        if (!j.ok) setLoadErr(j.error || 'This payment link is not valid.');
        else setPage(j.page);
      } catch {
        if (live) setLoadErr('Could not reach the server — check your connection and refresh.');
      }
    })();
    return () => { live = false; };
  }, [token]);

  if (!page && !loadErr) return <FullPageLoader label="Loading your secure payment page…" />;

  if (loadErr) {
    return (
      <div className="min-h-screen bg-ivory"><MinimalHeader secure />
        <main className="max-w-xl mx-auto px-4 sm:px-6 py-16">
          <div className="dash-card p-8 text-center">
            <span className="mx-auto w-14 h-14 rounded-full bg-[#F8E7E3] text-[#B4432F] grid place-items-center"><XCircle className="w-7 h-7" /></span>
            <p className="font-display text-2xl text-navy mt-4">Link not available</p>
            <p className="text-[14px] text-charcoal/65 mt-2">{loadErr}</p>
            <Link href="/" className="btn btn-navy mt-6">Back to the store</Link>
          </div>
        </main>
      </div>
    );
  }

  const { request: req, quote, order, store } = page;
  const isQuote = req.kind === 'quote';
  const amount = isQuote ? (quote.payTotal ?? quote.total) : req.amount;
  const paid = req.status === 'paid' || doneOrder || (isQuote && quote.status === 'accepted');
  const closed = !paid && (req.status !== 'open' || page.expired);
  const payCard = page.pay.card;
  const payCod = page.pay.cod;
  const signedInOwner = me?.role === 'customer';
  const orderId = doneOrder || page.orderId;

  const pay = async () => {
    setErr('');
    if (page.needsAddress && (!addr.line1.trim() || !addr.city.trim() || !addr.state || !addr.postcode.trim())) { setErr('Please enter the full delivery address.'); return; }
    let sourceId; let verificationToken;
    if (payCard) {
      try {
        const t = await cardRef.current?.tokenize({ amount });
        if (!t?.token) throw new Error('Please enter your card details.');
        sourceId = t.token; verificationToken = t.verificationToken;
      } catch (e) { setErr(e.message || 'Please check your card details.'); return; }
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/pay/${encodeURIComponent(token)}`, {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: payCard ? 'card' : 'cod', sourceId, verificationToken, address: page.needsAddress ? { ...addr, country: 'United States' } : undefined }),
      });
      const j = await r.json();
      if (!j.ok) { setErr(j.error || 'The payment did not go through.'); setBusy(false); return; }
      setPage(j.page);
      setDoneOrder(j.orderId);
      useStore.getState().refresh?.();
    } catch {
      setErr('Could not reach the server. Please check your connection — you have not been charged twice if you try again.');
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-ivory">
      {busy && <BusyOverlay label={payCard ? 'Processing your payment…' : 'Confirming your order…'} delay={0} />}
      <MinimalHeader secure />
      <main className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 lg:py-12">
        <p className="kicker">{isQuote ? `Quote ${quote.id}` : `Payment ${req.id}`}</p>
        <h1 className="h-display text-navy text-[2rem] sm:text-[2.5rem] mt-2">{paid ? 'Thank you!' : isQuote ? 'Review & pay your quote' : `Pay the balance on ${order.id}`}</h1>
        {req.name && !paid && <p className="text-[14px] text-charcoal/60 mt-1.5">For {req.name}</p>}

        <div className="mt-8 grid lg:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
          {/* What it's for */}
          <section className="dash-card overflow-hidden">
            <div className="px-5 sm:px-7 pt-6 pb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10.5px] font-extrabold tracking-[.2em] uppercase text-gold">{isQuote ? 'Quotation from JOLOF TRADING' : 'Order balance'}</p>
                <h2 className="font-display text-[1.4rem] text-navy">{isQuote ? 'Your quotation' : `Order ${order.id}`}</h2>
              </div>
              {isQuote && quote.validUntil && (
                <div className={`rounded-xl px-3.5 py-2 text-right ${page.expired ? 'bg-[#F8E7E3] text-[#B4432F]' : 'bg-ivory text-navy'}`}>
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[.14em] opacity-70">{page.expired ? 'Expired' : 'Valid until'}</p>
                  <p className="font-extrabold text-[14px]">{fmtDate(quote.validUntil)}</p>
                </div>
              )}
            </div>
            <div className="px-5 sm:px-7">
              {isQuote
                ? <Lines lines={quote.lines.map((l) => ({ ...l, price: l.unitPrice }))} />
                : <Lines lines={order.items} />}
            </div>
            <dl className="px-5 sm:px-7 py-5 space-y-1.5">
              {isQuote ? (
                <>
                  <Row k={`Delivery${quote.deliveryMiles ? ` · ~${Math.round(quote.deliveryMiles)} mi` : ''}`} v={quote.shipping ? money(quote.shipping) : 'Included'} />
                  {quote.discount > 0 && <Row k="Discount" v={`−${money(quote.discount)}`} />}
                  {quote.cardFee > 0 ? (
                    <>
                      <Row k="Quote total" v={money(quote.total)} />
                      <Row k="Card processing fee" v={money(quote.cardFee)} />
                      <Row k="Total by card" v={`${money(quote.payTotal)} USD`} strong />
                    </>
                  ) : <Row k="Quote total" v={`${money(quote.total)} USD`} strong />}
                </>
              ) : (
                <>
                  <Row k="Subtotal" v={money(order.subtotal)} />
                  <Row k="Delivery" v={order.shipping ? money(order.shipping) : 'Free'} />
                  {order.discount > 0 && <Row k="Discount" v={`−${money(order.discount)}`} />}
                  {order.cardFee > 0 && <Row k="Card processing fee" v={money(order.cardFee)} />}
                  <Row k="Confirmed total" v={money(order.total)} />
                  <Row k="Already paid" v={`−${money(Math.round((order.total - req.amount) * 100) / 100)}`} />
                  <Row k="Balance to pay" v={`${money(req.amount)} USD`} strong />
                </>
              )}
            </dl>
            {isQuote && quote.note && <div className="px-5 sm:px-7 py-4 border-t border-navy/5 flex gap-3 text-[13.5px] text-charcoal/75"><MessageSquareText className="w-4 h-4 text-gold shrink-0 mt-0.5" /><p>{quote.note}</p></div>}
            {!isQuote && req.reason && <p className="px-5 sm:px-7 py-4 border-t border-navy/5 text-[13px] text-charcoal/65">{req.reason}</p>}
            {page.address && (
              <div className="px-5 sm:px-7 py-4 border-t border-navy/5 flex gap-3 text-[13.5px] text-charcoal/80">
                <MapPin className="w-4 h-4 text-navy/40 shrink-0 mt-0.5" />
                <p><b className="text-navy">Deliver to:</b> {[page.address.line1, page.address.city, page.address.state, page.address.postcode].filter(Boolean).join(', ')}</p>
              </div>
            )}
          </section>

          {/* Pay */}
          <aside className="dash-card p-5 sm:p-6 lg:sticky lg:top-6">
            {paid ? (
              <div className="text-center py-4">
                <span className="mx-auto w-14 h-14 rounded-full bg-[#E3F2EA] text-emerald grid place-items-center"><CheckCircle2 className="w-7 h-7" /></span>
                <p className="font-display text-[1.5rem] text-navy mt-4">{isQuote ? 'Order confirmed' : 'Payment received'}</p>
                <p className="text-[13.5px] text-charcoal/65 mt-2">
                  {isQuote ? <>Your quote is accepted{orderId ? <> and order <b className="text-navy">{orderId}</b> is confirmed</> : ''}. </> : <>The balance on order <b className="text-navy">{order.id}</b> is paid. </>}
                  We&apos;ve emailed you a confirmation{req.paidAt ? ` (${fmtDateTime(req.paidAt)})` : ''}.
                </p>
                {signedInOwner && orderId && <Link href={`/account/orders/${orderId}`} className="btn btn-navy w-full mt-6">View your order <ArrowRight className="mv" /></Link>}
                <Link href="/" className="btn btn-line-dark w-full mt-2.5 !min-h-[44px] !py-2.5">Continue shopping</Link>
              </div>
            ) : closed ? (
              <div className="text-center py-4">
                <span className="mx-auto w-14 h-14 rounded-full bg-gold-pale text-[#8a6417] grid place-items-center"><Clock3 className="w-7 h-7" /></span>
                <p className="font-display text-[1.4rem] text-navy mt-4">{page.expired ? 'This quote has expired' : 'This link is no longer active'}</p>
                <p className="text-[13.5px] text-charcoal/65 mt-2">{page.expired ? 'Prices may have changed — contact us and we\'ll send you an updated quote.' : 'It may have been replaced by a newer link or cancelled. Please contact us.'}</p>
                <p className="text-[13px] text-navy font-bold mt-4">{store.email}{store.phone ? ` · ${store.phone}` : ''}</p>
              </div>
            ) : (
              <>
                <h2 className="font-display text-[1.35rem] text-navy">{payCard ? 'Pay by card' : 'Accept quote'}</h2>
                <p className="text-[12.5px] text-charcoal/60 mt-1">{isQuote ? (payCard ? 'Paying confirms your order at these prices and issues your invoice.' : 'Accepting confirms your order — pay our driver in cash or by check on delivery.') : 'Pays the remaining balance so we can deliver your order.'}</p>

                {page.needsAddress && (
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <p className="dash-label col-span-2 !mb-0">Delivery address</p>
                    <input className="dash-input col-span-2" placeholder="Street address" value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} autoComplete="street-address" />
                    <input className="dash-input col-span-2" placeholder="City" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
                    <select className="dash-input" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} aria-label="State"><option value="">State</option>{STATES.map((st) => <option key={st}>{st}</option>)}</select>
                    <input className="dash-input" placeholder="ZIP" inputMode="numeric" value={addr.postcode} onChange={(e) => setAddr({ ...addr, postcode: e.target.value })} />
                  </div>
                )}

                {payCard && <div className="mt-5 rounded-2xl border border-navy/10 bg-white p-4"><SquareCardForm ref={cardRef} /></div>}
                {payCod && <div className="mt-5 rounded-2xl bg-gold-pale/60 px-4 py-3 text-[13px] text-[#6d4f12] flex gap-2.5"><Banknote className="w-4 h-4 shrink-0 mt-0.5" />Card payments aren&apos;t available right now, so this order is cash / check on delivery.</div>}

                <dl className="mt-5 rounded-xl bg-ivory px-4 py-3"><Row k={isQuote ? 'Total to pay' : 'Balance to pay'} v={`${money(amount)} USD`} strong plain /></dl>
                {err && <p role="alert" className="mt-4 text-[13px] font-semibold text-[#B4432F] bg-[#F8E7E3] rounded-xl px-4 py-3">{err}</p>}
                <button type="button" onClick={pay} disabled={busy} className="btn btn-gold w-full mt-4">
                  {busy ? 'Processing…' : payCard ? <><CreditCard className="w-4 h-4" /> Pay {money(amount)}</> : <><FileText className="w-4 h-4" /> Accept quote · pay on delivery</>}
                </button>
                <p className="mt-3 text-[11.5px] text-center text-charcoal/50 flex items-center justify-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Private link · questions? {store.email}</p>
              </>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
