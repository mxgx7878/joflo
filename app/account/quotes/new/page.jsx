'use client';
import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Boxes, Package, Plus, Send, Ship, Trash2 } from 'lucide-react';
import { useStore, useCurrentUser } from '@/lib/store';
import { useDepartments } from '@/lib/departments';
import { productImg } from '@/lib/catalogue';
import { money, sizeLine } from '@/lib/format';
import { Field, PageHeader } from '@/components/ui';
import { useToast } from '@/components/Providers';

const TYPES = [
  { v: 'product', icon: Package, t: 'Product enquiry', d: 'Wholesale pricing on specific products, by the case.' },
  { v: 'commodity', icon: Ship, t: 'Commodity quote', d: 'Grains, oilseeds & shea — quoted per metric tonne.' },
  { v: 'bulk', icon: Boxes, t: 'General bulk request', d: 'Pallets, mixed loads or anything else.' },
];

function NewRequest() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const user = useCurrentUser();
  const products = useStore((s) => s.products);
  const commodities = useStore((s) => s.commodities);
  const submitInquiry = useStore((s) => s.submitInquiry);

  const preProduct = params.get('product');
  const preCommodity = params.get('commodity');
  const [type, setType] = useState(preCommodity ? 'commodity' : params.get('type') || 'product');
  const [items, setItems] = useState(() => (preProduct && products.some((p) => p.id === preProduct) ? [{ productId: preProduct, qty: 1 }] : []));
  const [pick, setPick] = useState('');
  const [onlyPOR, setOnlyPOR] = useState(true);
  const [trade, setTrade] = useState({ commodityId: preCommodity || '', qty: '', incoterm: 'CIF', port: '', frequency: 'One-off', targetPrice: '' });
  const depts = useDepartments();
  const [dept, setDept] = useState('Food');
  const [message, setMessage] = useState('');
  const [err, setErr] = useState('');

  const options = useMemo(() => products.filter((p) => p.status === 'active' && (!onlyPOR || p.price === null) && !items.some((i) => i.productId === p.id)), [products, onlyPOR, items]);
  const commodity = commodities.find((c) => c.id === trade.commodityId);
  if (!user) return null;

  const addItem = () => { if (!pick) return; setItems((x) => [...x, { productId: pick, qty: 1 }]); setPick(''); setErr(''); };
  const upTrade = (k) => (e) => { setTrade((t) => ({ ...t, [k]: e.target.value })); setErr(''); };

  const submit = async (e) => {
    e.preventDefault();
    let payload;
    if (type === 'product') {
      if (!items.length) { setErr('Add at least one product to your enquiry.'); return; }
      const ps = items.map((i) => products.find((p) => p.id === i.productId)).filter(Boolean);
      payload = {
        type: 'product', dept: [...new Set(ps.map((p) => p.dept))].join(', '), message,
        items: items.map((i) => ({ productId: i.productId, name: products.find((p) => p.id === i.productId)?.name, qty: Number(i.qty) || 1, unit: 'cases' })),
      };
    } else if (type === 'commodity') {
      if (!commodity) { setErr('Choose a commodity.'); return; }
      if (!(Number(trade.qty) > 0)) { setErr('Enter the quantity in metric tonnes.'); return; }
      if (!trade.port.trim()) { setErr('Enter the delivery port or destination.'); return; }
      payload = {
        type: 'commodity', dept: depts.trading[0]?.name || 'Trading', message,
        items: [{ commodityId: commodity.id, name: commodity.name, qty: Number(trade.qty), unit: commodity.unit || 'MT' }],
        trade: { incoterm: trade.incoterm, port: trade.port.trim(), frequency: trade.frequency, targetPrice: trade.targetPrice ? Number(trade.targetPrice) : null },
      };
    } else {
      if (message.trim().length < 10) { setErr('Tell us what you need — products, quantities and timing.'); return; }
      payload = { type: 'bulk', dept, message, items: [] };
    }
    const r = await submitInquiry({ ...payload, name: user.name, company: user.company, email: user.email, phone: user.phone });
    if (!r.ok) { setErr(r.error); return; }
    toast({ text: `Request ${r.id} sent — we'll reply here with a quote.` });
    router.push(`/account/quotes/${r.id}`);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-3">
        {TYPES.map(({ v, icon: Icon, t, d }) => {
          const on = type === v;
          return (
            <button key={v} type="button" onClick={() => { setType(v); setErr(''); }} aria-pressed={on}
              className={`text-left rounded-2xl border-[1.5px] p-4 transition bg-white ${on ? 'border-emerald shadow-[0_0_0_3px_rgba(7,86,60,.12)]' : 'border-[#E2DED2] hover:border-navy/40'}`}>
              <span className={`w-10 h-10 rounded-xl grid place-items-center ${on ? 'bg-emerald text-white' : 'bg-ivory text-navy'}`}><Icon className="w-5 h-5" strokeWidth={1.8} /></span>
              <p className="font-extrabold text-navy mt-3 text-[14.5px]">{t}</p>
              <p className="text-[12.5px] text-charcoal/60 mt-0.5">{d}</p>
            </button>
          );
        })}
      </div>

      <section className="dash-card p-5 sm:p-6">
        {type === 'product' && (
          <>
            <h2 className="font-display text-[1.3rem] text-navy">Products</h2>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <select value={pick} onChange={(e) => setPick(e.target.value)} className="dash-input flex-1" aria-label="Choose a product">
                <option value="">Choose a product…</option>
                {depts.product.map((x) => x.name).map((d) => (
                  <optgroup key={d} label={d}>
                    {options.filter((p) => p.dept === d).map((p) => <option key={p.id} value={p.id}>{p.name} — {sizeLine(p) || p.cat}{p.price === null ? '' : ` (${money(p.price)})`}</option>)}
                  </optgroup>
                ))}
              </select>
              <button type="button" onClick={addItem} disabled={!pick} className="dash-btn dash-btn-navy !h-[46px]"><Plus />Add</button>
            </div>
            <label className="mt-3 inline-flex items-center gap-2 text-[12.5px] font-semibold text-charcoal/65 cursor-pointer">
              <input type="checkbox" checked={onlyPOR} onChange={(e) => setOnlyPOR(e.target.checked)} className="w-4 h-4 accent-[#07563C]" /> Only show "price on request" products
            </label>
            {items.length > 0 ? (
              <ul className="mt-5 divide-y divide-navy/5 border-t border-navy/5">
                {items.map((it, idx) => {
                  const p = products.find((x) => x.id === it.productId);
                  if (!p) return null;
                  return (
                    <li key={it.productId} className="flex items-center gap-3 py-3">
                      <img src={productImg(p)} alt="" className="w-14 h-14 rounded-xl object-contain bg-ivory p-1 shrink-0" />
                      <div className="flex-1 min-w-0"><p className="font-bold text-navy text-[13.5px] leading-snug">{p.name}</p><p className="text-[11.5px] text-charcoal/50">{sizeLine(p) || p.cat}</p></div>
                      <label className="flex items-center gap-2 text-[12px] text-charcoal/60">
                        <input type="number" min="1" value={it.qty} onChange={(e) => setItems((x) => x.map((y, j) => (j === idx ? { ...y, qty: e.target.value } : y)))} className="dash-input !w-20 !py-2 text-center" aria-label={`Cases of ${p.name}`} />
                        cases
                      </label>
                      <button type="button" onClick={() => setItems((x) => x.filter((_, j) => j !== idx))} className="p-2 text-charcoal/35 hover:text-[#B4432F]" aria-label={`Remove ${p.name}`}><Trash2 className="w-4 h-4" /></button>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="mt-5 text-[13px] text-charcoal/50 rounded-xl bg-ivory p-4">No products added yet.</p>}
          </>
        )}

        {type === 'commodity' && (
          <>
            <h2 className="font-display text-[1.3rem] text-navy">Commodity details</h2>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <Field label="Commodity *" className="sm:col-span-2">
                <select value={trade.commodityId} onChange={upTrade('commodityId')} className="dash-input">
                  <option value="">Choose a commodity…</option>
                  {[...new Set(commodities.map((c) => c.group))].map((g) => (
                    <optgroup key={g} label={g}>{commodities.filter((c) => c.group === g && c.status === 'active').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
                  ))}
                </select>
              </Field>
              {commodity && (
                <div className="sm:col-span-2 flex items-center gap-4 rounded-2xl bg-ivory p-3">
                  <img src={commodity.img} alt="" className="w-20 h-16 rounded-xl object-cover shrink-0" />
                  <div className="text-[12.5px] text-charcoal/65">
                    <p className="font-bold text-navy text-[14px]">{commodity.name}</p>
                    <p>{commodity.line}</p>
                    <p className="mt-1">Origin: {commodity.origin} · Min. {commodity.minQty} {commodity.unit} · Indicative ~{money(commodity.indicative)}/{commodity.unit}</p>
                  </div>
                </div>
              )}
              <Field label="Quantity (metric tonnes) *" hint={commodity ? `Minimum ${commodity.minQty} MT` : undefined}><input type="number" min="1" value={trade.qty} onChange={upTrade('qty')} className="dash-input" /></Field>
              <Field label="Incoterm">
                <select value={trade.incoterm} onChange={upTrade('incoterm')} className="dash-input">{['FOB', 'CIF', 'CFR', 'EXW'].map((x) => <option key={x}>{x}</option>)}</select>
              </Field>
              <Field label="Delivery port / destination *"><input value={trade.port} onChange={upTrade('port')} className="dash-input" placeholder="e.g. Port of New York/New Jersey" /></Field>
              <Field label="Frequency">
                <select value={trade.frequency} onChange={upTrade('frequency')} className="dash-input">{['One-off', 'Monthly', 'Quarterly', 'Seasonal'].map((x) => <option key={x}>{x}</option>)}</select>
              </Field>
              <Field label="Target price (USD per MT)" hint="Optional"><input type="number" min="0" value={trade.targetPrice} onChange={upTrade('targetPrice')} className="dash-input" /></Field>
            </div>
          </>
        )}

        {type === 'bulk' && (
          <>
            <h2 className="font-display text-[1.3rem] text-navy">Bulk request</h2>
            <Field label="Department" className="mt-4 max-w-xs">
              <select value={dept} onChange={(e) => setDept(e.target.value)} className="dash-input">{[...depts.visible.map((x) => x.name), 'Mixed'].map((d) => <option key={d}>{d}</option>)}</select>
            </Field>
          </>
        )}

        <Field label={type === 'bulk' ? 'Products, quantities & timing *' : 'Message (optional)'} className="mt-5">
          <textarea rows={4} value={message} onChange={(e) => { setMessage(e.target.value); setErr(''); }} className="dash-input resize-y"
            placeholder={type === 'commodity' ? 'Grade / specification, packaging, delivery window…' : type === 'bulk' ? 'e.g. 1 mixed pallet — Jumbo cubes, Maggi, Saafia range…' : 'Anything we should know — delivery timing, brands, pack sizes…'} />
        </Field>
      </section>

      <section className="dash-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-[13px] text-charcoal/65">
          <p className="dash-label !mb-1">Sending as</p>
          <p><b className="text-navy">{user.name}</b>{user.company ? ` · ${user.company}` : ''} · {user.email}{user.phone ? ` · ${user.phone}` : ''}</p>
        </div>
        <button type="submit" className="btn btn-gold shrink-0"><Send className="mv" />Send request</button>
      </section>
      {err && <p role="alert" className="text-[13px] font-semibold text-[#B4432F] bg-[#F8E7E3] rounded-xl px-4 py-3">{err}</p>}
    </form>
  );
}

export default function NewRequestPage() {
  return (
    <>
      <Link href="/account/quotes" className="inline-flex items-center gap-2 text-[13px] font-bold text-navy hover:text-emerald mb-4"><ArrowLeft className="w-4 h-4" />Quotes & inquiries</Link>
      <PageHeader kicker="New request" title="Request a quote" sub="Our team replies with a quote in your account — usually within one business day." />
      <Suspense fallback={null}><NewRequest /></Suspense>
    </>
  );
}
