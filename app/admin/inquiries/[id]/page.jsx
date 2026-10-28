'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Mail, Phone, Building2, Send, Plus, Trash2, FileText, StickyNote, CheckCircle2, ExternalLink, Wheat, Pencil, Route } from 'lucide-react';
import { STATES } from '@/lib/locations';
import { useStore, useStoreReady, quoteTotal } from '@/lib/store';
import { money, fmtDate, fmtDateTime, INQUIRY_STATUS, INQUIRY_TYPE, sizeLine, qtyUnit } from '@/lib/format';
import { productImg } from '@/lib/catalogue';
import { Pill, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Card, KV, Skeleton, Initials } from '@/components/admin/common';

const plusDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
let keySeq = 0;
const k = () => `l${++keySeq}`;

function QuoteBuilder({ inq, products, commodities, onSent, onCancel }) {
  const sendQuote = useStore((s) => s.sendQuote);
  const estimateDelivery = useStore((s) => s.estimateDelivery);
  const users = useStore((s) => s.users);
  const toast = useToast();
  const initial = useMemo(() => {
    if (inq.quote) return inq.quote.lines.map((l) => ({ ...l, key: k() }));
    const fromItems = inq.items.map((it) => {
      if (it.productId) {
        const p = products.find((x) => x.id === it.productId);
        return { key: k(), productId: it.productId, name: it.name, size: p ? sizeLine(p) : '', qty: it.qty || 1, unit: it.unit || 'units', unitPrice: p && typeof p.price === 'number' ? p.price : '' };
      }
      const c = commodities.find((x) => x.id === it.commodityId);
      return { key: k(), productId: null, commodityId: it.commodityId, name: it.name, size: c ? `${c.origin} origin · per ${c.unit}` : 'per MT', qty: it.qty || c?.minQty || 1, unit: it.unit || 'MT', unitPrice: c?.indicative ?? '' };
    });
    return fromItems.length ? fromItems : [{ key: k(), productId: null, name: '', size: '', qty: 1, unit: 'units', unitPrice: '' }];
  }, [inq, products, commodities]);

  const [lines, setLines] = useState(initial);
  const [shipping, setShipping] = useState(inq.quote?.shipping ?? 0);
  const [validUntil, setValidUntil] = useState(inq.quote?.validUntil || plusDays(14));
  const [note, setNote] = useState(inq.quote?.note || (inq.type === 'commodity' ? 'Indicative price per metric tonne. Final price confirmed on contract, subject to quality inspection.' : 'Prices per unit/case as listed. Stock reserved until the quote expires.'));
  const [pick, setPick] = useState('');
  const [err, setErr] = useState('');
  const [discount, setDiscount] = useState(inq.quote?.discount || '');
  const [miles, setMiles] = useState(inq.quote?.deliveryMiles ?? null);
  const acct = users.find((u) => u.id === inq.userId);
  const [addr, setAddr] = useState(() => inq.address || acct?.addresses?.find((a) => a.isDefault) || acct?.addresses?.[0] || { line1: '', city: '', state: '', postcode: '' });
  const [calc, setCalc] = useState('');
  const [sending, setSending] = useState(false);
  const calculate = async () => {
    if (!addr.city || !addr.state) { setCalc('Enter at least the city and state.'); return; }
    setCalc('Calculating…');
    const e = await estimateDelivery(lines.filter((l) => l.name).map((l) => ({ productId: l.productId, qty: l.qty, unitPrice: l.unitPrice })), { ...addr, country: 'United States' });
    if (!e || e.deliveryFee == null) { setCalc('Could not work out a distance for this address.'); return; }
    setShipping(e.deliveryFee); setMiles(e.miles);
    setCalc(`${e.shipments || 1} shipment${e.shipments > 1 ? 's' : ''} · ~${Math.round(e.miles || 0)} mi${e.precise ? '' : ' (approximate)'}${e.unavailable?.length ? ` · ${e.unavailable.length} line(s) not in stock anywhere` : ''}`);
  };

  const upd = (key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0) + (Number(shipping) || 0) - (Number(discount) || 0);

  const addProduct = (id) => {
    if (!id) return;
    if (id === '__custom') { setLines((ls) => [...ls, { key: k(), productId: null, name: '', size: '', qty: 1, unit: 'units', unitPrice: '' }]); setPick(''); return; }
    const p = products.find((x) => x.id === id);
    setLines((ls) => [...ls, { key: k(), productId: p.id, name: p.name, size: sizeLine(p), qty: p.moq || 1, unit: p.pack ? 'cases' : 'units', unitPrice: typeof p.price === 'number' ? p.price : '' }]);
    setPick('');
  };

  const send = async () => {
    const clean = lines.filter((l) => l.name.trim());
    if (!clean.length) return setErr('Add at least one line.');
    const bad = clean.find((l) => !(Number(l.qty) > 0) || !(Number(l.unitPrice) > 0));
    if (bad) return setErr(`Enter a quantity and unit price for “${bad.name}”.`);
    setErr('');
    setSending(true);
    const r = await sendQuote(inq.id, {
      lines: clean.map(({ key, ...l }) => ({ ...l, qty: Number(l.qty), unitPrice: Math.round(Number(l.unitPrice) * 100) / 100 })),
      shipping: Number(shipping) || 0, discount: Number(discount) || 0, deliveryMiles: miles, validUntil, note: note.trim(),
      address: addr.line1 || addr.city ? { label: addr.label || 'Delivery', line1: addr.line1, city: addr.city, state: addr.state, postcode: addr.postcode, country: 'United States' } : undefined,
    });
    setSending(false);
    if (!r.ok) { setErr(r.error); return; }
    toast({ text: `Quote sent to ${inq.name} · ${money(Math.round(total * 100) / 100)}` });
    onSent?.();
  };

  return (
    <Card title={inq.quote ? 'Revise quote' : 'Build a quote'} action={onCancel && <button className="text-[12.5px] font-bold text-charcoal/55 hover:text-navy" onClick={onCancel}>Cancel</button>} pad={false}>
      <div className="overflow-x-auto">
        <table className="dash-table min-w-[680px]">
          <thead><tr><th>Item</th><th className="w-[90px]">Qty</th><th className="w-[100px]">Unit</th><th className="w-[150px]">Unit price</th><th className="w-[110px] text-right">Line total</th><th className="w-10" /></tr></thead>
          <tbody>
            {lines.map((l) => {
              const p = l.productId && products.find((x) => x.id === l.productId);
              return (
                <tr key={l.key}>
                  <td>
                    <div className="flex items-center gap-3">
                      {p ? <img src={productImg(p)} alt="" className="w-10 h-10 rounded-lg object-contain bg-ivory p-0.5 shrink-0" /> : <span className="w-10 h-10 rounded-lg bg-ivory grid place-items-center shrink-0 text-navy/40">{l.commodityId ? <Wheat className="w-4 h-4" /> : <FileText className="w-4 h-4" />}</span>}
                      <div className="flex-1 min-w-[180px]">
                        <input className="dash-input !py-1.5 !text-[13px] font-semibold" value={l.name} onChange={(e) => upd(l.key, { name: e.target.value })} placeholder="Item name" />
                        <input className="w-full bg-transparent text-[11.5px] text-charcoal/55 mt-1 px-1 focus:outline-none" value={l.size || ''} onChange={(e) => upd(l.key, { size: e.target.value })} placeholder="Size / pack / spec" />
                      </div>
                    </div>
                  </td>
                  <td><input type="number" min="0" className="dash-input !py-1.5 !text-[13px]" value={l.qty} onChange={(e) => upd(l.key, { qty: e.target.value })} /></td>
                  <td><input className="dash-input !py-1.5 !text-[13px]" value={l.unit || ''} onChange={(e) => upd(l.key, { unit: e.target.value })} /></td>
                  <td>
                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-charcoal/45">$</span>
                      <input type="number" min="0" step="0.01" className={`dash-input !py-1.5 !pl-6 !text-[13px] ${l.unitPrice === '' ? '!border-gold' : ''}`} value={l.unitPrice} onChange={(e) => upd(l.key, { unitPrice: e.target.value })} placeholder="Price" />
                    </div>
                  </td>
                  <td className="text-right font-bold text-navy whitespace-nowrap">{money((Number(l.qty) || 0) * (Number(l.unitPrice) || 0))}</td>
                  <td><button className="w-8 h-8 grid place-items-center rounded-full text-charcoal/40 hover:text-[#B4432F] hover:bg-[#F8E7E3]" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Remove line"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-5 pt-4 flex flex-wrap items-center gap-2">
        <Plus className="w-4 h-4 text-emerald" />
        <select className="h-10 rounded-full bg-white border-[1.5px] border-[#E2DED2] px-4 text-[13px] font-semibold text-navy focus:outline-none focus:border-gold max-w-full" value={pick} onChange={(e) => addProduct(e.target.value)}>
          <option value="">Add a product from the catalogue…</option>
          <option value="__custom">＋ Custom line (free text)</option>
          {['Food', 'Cosmetics'].map((d) => (
            <optgroup key={d} label={d}>{products.filter((p) => p.dept === d).map((p) => <option key={p.id} value={p.id}>{p.name} {sizeLine(p) ? `(${sizeLine(p)})` : ''}</option>)}</optgroup>
          ))}
        </select>
      </div>
      <div className="p-5 grid md:grid-cols-[minmax(0,1fr)_280px] gap-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <label><span className="dash-label">Valid until</span><input type="date" className="dash-input" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></label>
          <div className="sm:col-span-2 rounded-2xl border border-navy/10 p-4">
            <p className="dash-label flex items-center gap-1.5"><Route className="w-3.5 h-3.5" /> Delivery address</p>
            <div className="grid sm:grid-cols-[minmax(0,1fr)_120px_80px_100px] gap-2">
              <input className="dash-input !text-[13px]" value={addr.line1 || ''} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} placeholder="Street" />
              <input className="dash-input !text-[13px]" value={addr.city || ''} onChange={(e) => setAddr({ ...addr, city: e.target.value })} placeholder="City" />
              <select className="dash-input !text-[13px]" value={addr.state || ''} onChange={(e) => setAddr({ ...addr, state: e.target.value })}><option value="">ST</option>{STATES.map((st) => <option key={st}>{st}</option>)}</select>
              <input className="dash-input !text-[13px]" value={addr.postcode || ''} onChange={(e) => setAddr({ ...addr, postcode: e.target.value })} placeholder="ZIP" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 items-end">
              <label><span className="dash-label">Delivery ($)</span><input type="number" min="0" step="0.01" className="dash-input" value={shipping} onChange={(e) => setShipping(e.target.value)} /></label>
              <button type="button" className="dash-btn dash-btn-ghost" onClick={calculate}><Route /> Calculate by distance</button>
            </div>
            {calc && <p className="text-[12px] text-charcoal/60 mt-2">{calc}</p>}
          </div>
          <label><span className="dash-label">Discount ($)</span><input type="number" min="0" step="0.01" className="dash-input" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" /></label>
          <label className="sm:col-span-2"><span className="dash-label">Note to customer</span><textarea rows={3} className="dash-input" value={note} onChange={(e) => setNote(e.target.value)} /></label>
        </div>
        <div className="bg-navy text-white rounded-2xl p-5 flex flex-col">
          <p className="text-[11px] font-extrabold tracking-[.16em] uppercase text-white/55">Quote total</p>
          <p className="text-[2rem] font-extrabold mt-1">{money(Math.round(total * 100) / 100)}</p>
          <p className="text-[12px] text-white/55">{lines.filter((l) => l.name).length} lines · valid to {fmtDate(validUntil)}</p>
          {err && <p className="mt-3 text-[12.5px] font-bold text-gold-soft">{err}</p>}
          <button className="dash-btn dash-btn-gold mt-auto pt-0 w-full !mt-5" disabled={sending} onClick={send}><Send /> {sending ? 'Sending…' : inq.quote ? 'Send revised quote' : 'Send quote to customer'}</button>
          <p className="text-[11px] text-white/45 mt-2 text-center">{inq.userId ? 'Appears in the customer’s account to accept.' : 'Guest — they’ll see it when they register with this email.'}</p>
        </div>
      </div>
    </Card>
  );
}

function QuoteSummary({ quote }) {
  return (
    <>
      <ul className="divide-y divide-navy/5 -mx-5">
        {quote.lines.map((l, i) => (
          <li key={i} className="flex items-center gap-4 px-5 py-3 text-[13.5px]">
            <div className="flex-1 min-w-0"><p className="font-bold text-navy truncate">{l.name}</p><p className="text-[12px] text-charcoal/50">{l.size}</p></div>
            <span className="text-charcoal/65 whitespace-nowrap">{l.qty} {l.unit || ''} × {money(l.unitPrice)}</span>
            <span className="w-24 text-right font-extrabold text-navy">{money(l.qty * l.unitPrice)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 pt-3 border-t border-navy/10 grid sm:grid-cols-2 gap-4">
        <div className="text-[13px] text-charcoal/70">{quote.note && <p className="bg-ivory rounded-xl p-3">{quote.note}</p>}</div>
        <div>
          <KV k={`Delivery${quote.deliveryMiles ? ` · ~${Math.round(quote.deliveryMiles)} mi` : ''}`} v={quote.shipping ? money(quote.shipping) : 'Free'} />
          {quote.discount > 0 && <KV k="Discount" v={`−${money(quote.discount)}`} />}
          <KV k="Valid until" v={fmtDate(quote.validUntil)} />
          <div className="flex justify-between pt-2 mt-1 border-t border-navy/10"><span className="font-bold text-navy">Total</span><span className="text-lg font-extrabold text-navy">{money(quoteTotal(quote))}</span></div>
        </div>
      </div>
    </>
  );
}

export default function InquiryDetail() {
  const { id } = useParams();
  const ready = useStoreReady();
  const inq = useStore((s) => s.inquiries.find((i) => i.id === id));
  const products = useStore((s) => s.products);
  const commodities = useStore((s) => s.commodities);
  const users = useStore((s) => s.users);
  const setInquiryStatus = useStore((s) => s.setInquiryStatus);
  const addInquiryNote = useStore((s) => s.addInquiryNote);
  const toast = useToast();
  const [note, setNote] = useState('');
  const [revising, setRevising] = useState(false);
  useEffect(() => setRevising(false), [inq?.status]);

  if (!ready) return <Skeleton />;
  if (!inq) return <EmptyState icon={FileText} title="Inquiry not found" body={`We couldn't find ${id}.`} action={<Link href="/admin/inquiries" className="dash-btn dash-btn-navy">Back to inquiries</Link>} />;

  const customer = users.find((u) => u.id === inq.userId) || users.find((u) => u.role === 'customer' && u.email.toLowerCase() === inq.email.toLowerCase());
  const quotable = !['accepted', 'closed', 'declined'].includes(inq.status) && inq.type !== 'contact';
  const showBuilder = quotable && (!inq.quote || revising);
  const status = (s, msg) => { setInquiryStatus(inq.id, s); toast({ text: msg }); };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <Link href="/admin/inquiries" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-charcoal/60 hover:text-navy"><ArrowLeft className="w-4 h-4" /> Inquiries</Link>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <h1 className="h-display text-navy text-[2rem]">{inq.id}</h1>
            <Pill meta={INQUIRY_STATUS[inq.status]} />
            <span className="pill bg-white border border-navy/10 text-navy">{INQUIRY_TYPE[inq.type]}</span>
          </div>
          <p className="text-[13px] text-charcoal/55 mt-1">Received {fmtDateTime(inq.createdAt)}{inq.dept ? ` · ${inq.dept}` : ''}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {inq.status === 'new' && <button className="dash-btn dash-btn-ghost" onClick={() => status('in_review', 'Marked as in review')}>Mark in review</button>}
          {!['closed', 'accepted'].includes(inq.status) && <button className="dash-btn dash-btn-ghost" onClick={() => status('closed', 'Inquiry closed')}>Close</button>}
          {['closed', 'declined'].includes(inq.status) && <button className="dash-btn dash-btn-ghost" onClick={() => status('in_review', 'Inquiry reopened')}>Reopen</button>}
          <a href={`mailto:${inq.email}?subject=${encodeURIComponent(`JOLOF TRADING — ${inq.id}`)}`} className="dash-btn dash-btn-navy"><Mail /> Reply by email</a>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5">
        <div className="space-y-5 min-w-0">
          {inq.status === 'accepted' && inq.orderId && (
            <div className="rounded-2xl bg-[#E3F2EA] border border-emerald/15 p-4 flex flex-wrap items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald" />
              <p className="flex-1 text-[14px] text-emerald font-bold">Quote accepted — order {inq.orderId} was created.</p>
              <Link href={`/admin/orders/${inq.orderId}`} className="dash-btn dash-btn-navy">Open order <ExternalLink /></Link>
            </div>
          )}
          {inq.status === 'declined' && <div className="rounded-2xl bg-[#F8E7E3] p-4 text-[14px] font-bold text-[#B4432F]">The customer declined this quote. Reopen to send a revised one.</div>}

          <Card title="Message">
            <p className="text-[14.5px] leading-relaxed text-charcoal/80 whitespace-pre-line">{inq.message || <span className="text-charcoal/45">No message.</span>}</p>
            {inq.trade && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[['Incoterm', inq.trade.incoterm], ['Port / destination', inq.trade.port], ['Frequency', inq.trade.frequency], ['Target price', inq.trade.targetPrice ? `${money(inq.trade.targetPrice)}/MT` : '—']].map(([a, b]) => (
                  <div key={a} className="bg-ivory rounded-xl p-3"><p className="text-[10.5px] font-extrabold tracking-[.12em] uppercase text-charcoal/45">{a}</p><p className="text-[13.5px] font-bold text-navy mt-0.5">{b || '—'}</p></div>
                ))}
              </div>
            )}
          </Card>

          {inq.items.length > 0 && (
            <Card title={`Requested items (${inq.items.length})`} pad={false}>
              <ul className="divide-y divide-navy/5">
                {inq.items.map((it, i) => {
                  const p = it.productId && products.find((x) => x.id === it.productId);
                  const c = it.commodityId && commodities.find((x) => x.id === it.commodityId);
                  return (
                    <li key={i} className="flex items-center gap-4 px-5 py-3">
                      <img src={p ? productImg(p) : c?.img || '/brand/logo.webp'} alt="" className={`w-12 h-12 rounded-xl bg-ivory shrink-0 ${p ? 'object-contain p-1' : 'object-cover'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-navy text-[14px] truncate">{it.name}</p>
                        <p className="text-[12px] text-charcoal/55">{p ? `${sizeLine(p)} · ${typeof p.price === 'number' ? `List ${money(p.price)}` : 'Price on request'}` : c ? `${c.group} · indicative ${money(c.indicative)}/MT` : ''}</p>
                      </div>
                      <span className="text-[13.5px] font-extrabold text-navy whitespace-nowrap">{qtyUnit(it.qty, it.unit)}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {inq.quote && !showBuilder && (
            <Card title={inq.status === 'accepted' ? 'Accepted quote' : 'Quote sent'} action={
              <span className="flex items-center gap-3">
                <span className="text-[12px] text-charcoal/50">Sent {fmtDateTime(inq.quote.sentAt)}</span>
                {quotable && <button className="dash-btn dash-btn-ghost !h-8" onClick={() => setRevising(true)}><Pencil /> Revise</button>}
              </span>}>
              <QuoteSummary quote={inq.quote} />
              {inq.status === 'quoted' && <p className="mt-4 text-[12.5px] font-semibold text-[#5B3FA0] bg-[#EEE9F8] rounded-xl px-3 py-2">Waiting for the customer to accept or decline in their account.</p>}
            </Card>
          )}

          {showBuilder && <QuoteBuilder inq={inq} products={products} commodities={commodities} onSent={() => setRevising(false)} onCancel={revising ? () => setRevising(false) : null} />}
          {inq.type === 'contact' && !['closed'].includes(inq.status) && (
            <Card><p className="text-[13.5px] text-charcoal/65">General contact message — reply by email, add a note, then close it. Need to quote? <button className="font-bold text-emerald" onClick={() => toast({ text: 'Ask the customer to send a bulk pricing request with products and quantities.' })}>How to quote</button></p></Card>
          )}
        </div>

        <div className="space-y-5">
          <Card title="Contact">
            <div className="flex items-center gap-3">
              <Initials name={inq.name} className="w-11 h-11 text-[13px]" />
              <div className="min-w-0">
                <p className="font-bold text-navy truncate">{inq.name}</p>
                <p className="text-[12.5px] text-charcoal/55">{customer ? (customer.type === 'retailer' ? 'Registered retailer' : 'Registered customer') : 'Guest (not registered)'}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-[13px] text-charcoal/80">
              {inq.company && <p className="flex items-center gap-2"><Building2 className="w-4 h-4 text-navy/40" />{inq.company}</p>}
              <p className="flex items-center gap-2 break-all"><Mail className="w-4 h-4 text-navy/40 shrink-0" />{inq.email}</p>
              {inq.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-navy/40" />{inq.phone}</p>}
            </div>
            {customer && <Link href={`/admin/customers/${customer.id}`} className="mt-3 inline-block text-[12.5px] font-bold text-emerald hover:text-navy">View customer profile →</Link>}
          </Card>

          <Card title="Internal notes" action={<StickyNote className="w-4 h-4 text-gold" />}>
            {inq.notes.length === 0 && <p className="text-[13px] text-charcoal/50">No notes yet. Notes are only visible to your team.</p>}
            <ul className="space-y-3">
              {inq.notes.map((n, i) => (
                <li key={i} className="bg-gold-pale/50 rounded-xl p-3">
                  <p className="text-[13px] text-charcoal/85">{n.text}</p>
                  <p className="text-[11px] text-charcoal/45 mt-1 font-semibold">{n.by} · {fmtDateTime(n.at)}</p>
                </li>
              ))}
            </ul>
            <form className="mt-3" onSubmit={(e) => { e.preventDefault(); if (!note.trim()) return; addInquiryNote(inq.id, note.trim()); setNote(''); }}>
              <textarea rows={2} className="dash-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the team…" />
              <button className="dash-btn dash-btn-ghost w-full mt-2" disabled={!note.trim()}>Add note</button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
