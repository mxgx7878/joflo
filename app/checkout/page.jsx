'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, Clock3, FileText, Lock, MapPin, Minus, Plus, ShoppingBag, Trash2, Truck, UserRound } from 'lucide-react';
import { useStore, useCurrentUser, useStoreReady } from '@/lib/store';
import { rateLabel } from '@/lib/delivery';
import { productImg } from '@/lib/catalogue';
import { money, sizeLine } from '@/lib/format';
import { locationFromAddress, locationLabel, STATES } from '@/lib/locations';
import { useToast } from '@/components/Providers';
import { MinimalHeader, AddressPicker, PageLoader } from '@/components/account/shared';
import { LocationModal, useDeliveryLocation } from '@/components/LocationPicker';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function GInput({ id, label, value, onChange, error, className = '', ...rest }) {
  return (
    <label className={`block ${className}`} htmlFor={id}>
      <span className="dash-label">{label}</span>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`dash-input ${error ? '!border-[#B4432F]' : ''}`} {...rest} />
      {error && <span className="block text-[11.5px] text-[#B4432F] mt-1">{error}</span>}
    </label>
  );
}


function Step({ n, title, children }) {
  return (
    <section className="dash-card p-5 sm:p-7">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-8 h-8 rounded-full bg-navy text-white grid place-items-center text-[13px] font-extrabold">{n}</span>
        <h2 className="font-display text-[1.35rem] text-navy">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const ready = useStoreReady();
  const user = useCurrentUser();
  const toast = useToast();
  const cart = useStore((s) => s.cart);
  const products = useStore((s) => s.products);
  const settings = useStore((s) => s.settings);
  const { setQty, removeFromCart, placeOrder, submitInquiry, clearCart, previewDelivery, setDeliveryLocation } = useStore.getState();
  const { location, saved: savedLoc, label: locLabel } = useDeliveryLocation();
  const [locOpen, setLocOpen] = useState(false);
  const [addressId, setAddressId] = useState(null);
  const [guest, setGuest] = useState({ name: '', email: '', phone: '', company: '' });
  const [gAddr, setGAddr] = useState({ line1: '', city: '', state: '', postcode: '' });
  const [gErr, setGErr] = useState({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (user && !addressId) { const d = user.addresses.find((a) => a.isDefault) || user.addresses[0]; if (d) setAddressId(d.id); }
  }, [user, addressId]);

  // guest address starts from the chosen delivery location
  useEffect(() => {
    if (!location) return;
    setGAddr((a) => ({ ...a, city: a.city || savedLoc?.suburb || location.city, state: location.state, postcode: a.postcode || savedLoc?.postcode || '' }));
  }, [location?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isGuest = ready && !user;
  const address = isGuest ? { label: 'Delivery', ...gAddr, country: 'United States' } : user?.addresses.find((a) => a.id === addressId) || null;
  const addrLoc = address && (address.city || address.state) ? locationFromAddress(address) : null;
  const mismatch = location && addrLoc && addrLoc.state !== location.state ? addrLoc : null;

  // delivery is priced by road distance from the warehouse(s) that will ship — customers only see JOLOF TRADING
  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const addrKey = isGuest ? `${gAddr.line1}|${gAddr.city}|${gAddr.state}|${gAddr.postcode}` : addressId || '';
  const cartKey = JSON.stringify(cart);
  useEffect(() => {
    if (!ready) return undefined;
    const target = isGuest ? (gAddr.city && gAddr.state ? { ...gAddr, country: 'United States' } : null) : null;
    if (!target && !addressId) { setEstimate(null); return undefined; }
    let live = true;
    setEstimating(true);
    const t = setTimeout(async () => {
      const e = await previewDelivery(isGuest ? { address: target } : { addressId });
      if (live) { setEstimate(e); setEstimating(false); }
    }, 450);
    return () => { live = false; clearTimeout(t); };
  }, [ready, addrKey, cartKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const showPricing = settings.showPricing !== false;
  const lines = useMemo(() => Object.entries(cart).map(([id, qty]) => ({ p: products.find((x) => x.id === id), qty })).filter((l) => l.p && typeof l.p.price === 'number'), [cart, products]);
  const quoteOnly = useMemo(() => Object.entries(cart).map(([id, qty]) => ({ p: products.find((x) => x.id === id), qty })).filter((l) => l.p && typeof l.p.price !== 'number'), [cart, products]);
  const subtotal = Math.round(lines.reduce((s, l) => s + l.p.price * l.qty, 0) * 100) / 100;
  const shipping = estimate?.deliveryFee ?? null;
  const total = Math.round((subtotal + (shipping || 0)) * 100) / 100;
  const unavailable = (estimate?.unavailable || []).length;
  const pendingRetailer = user?.type === 'retailer' && user?.status === 'pending';
  const isAdmin = user?.role === 'admin';

  const isVendor = user?.role === 'vendor';

  if (!ready || placing) {
    return <div className="min-h-screen bg-ivory"><MinimalHeader secure /><div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-10"><PageLoader /></div></div>;
  }

  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const place = async () => {
    setError('');
    if (!location) { setError('Please choose your delivery location first.'); jump('step-location'); setLocOpen(true); return; }
    if (isGuest) {
      const e = {};
      if (guest.name.trim().length < 2) e.name = 'Please enter your name.';
      if (!EMAIL.test(guest.email.trim())) e.email = 'Enter a valid email — we send your confirmation here.';
      if (!guest.phone.trim()) e.phone = 'A phone number helps the driver reach you.';
      if (!gAddr.line1.trim()) e.line1 = 'Required';
      if (!gAddr.city.trim()) e.city = 'Required';
      if (!gAddr.state.trim()) e.state = 'Required';
      if (!gAddr.postcode.trim()) e.postcode = 'Required';
      setGErr(e);
      if (Object.keys(e).length) { setError('Please complete the highlighted fields.'); jump(e.name || e.email || e.phone ? 'step-details' : 'step-address'); return; }
    } else if (!address) { setError('Please choose or add a delivery address.'); jump('step-address'); return; }
    setPlacing(true);
    const r = await placeOrder({ address: isGuest ? address : undefined, addressId: isGuest ? undefined : addressId, notes, guest: isGuest ? guest : undefined });
    if (!r.ok) { setError(r.error); setPlacing(false); return; }
    router.push(`/checkout/success?order=${r.id}`);
  };

  const requestQuote = async () => {
    const who = user || { name: guest.name, company: guest.company, email: guest.email, phone: guest.phone };
    if (isGuest && (!guest.name.trim() || !EMAIL.test(guest.email.trim()))) { setGErr({ name: !guest.name.trim() && 'Please enter your name.', email: !EMAIL.test(guest.email.trim()) && 'Enter a valid email.' }); setError('Add your name and email so we can send the quote.'); jump('step-details'); return; }
    const all = [...lines, ...quoteOnly];
    const r = await submitInquiry({
      type: 'cart', name: who.name, company: who.company, email: who.email, phone: who.phone,
      dept: [...new Set(all.map((l) => l.p.dept))].join(', '),
      message: notes || 'Bulk quote requested for my cart.',
      items: all.map((l) => ({ productId: l.p.id, name: l.p.name, qty: l.qty, unit: 'units' })),
      address: isGuest && gAddr.city ? { ...gAddr, country: 'United States' } : undefined,
    });
    if (!r.ok) { setError(r.error); return; }
    clearCart();
    toast({ text: `Quote request ${r.id} sent — we'll reply ${user ? 'in your account' : 'by email'}.` });
    router.push(user ? `/account/quotes/${r.id}` : '/');
  };

  return (
    <div className="min-h-screen bg-ivory">
      <MinimalHeader secure />
      <main className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-28 lg:py-12">
        <p className="kicker">Checkout</p>
        <h1 className="h-display text-navy text-[2rem] sm:text-[2.5rem] mt-2">{lines.length && showPricing ? 'Send your order request' : 'Request a quote'}</h1>

        {(!lines.length || !showPricing) && quoteOnly.length + lines.length > 0 ? (
          <div className="dash-card mt-8 p-6 sm:p-8 max-w-2xl">
            <p className="font-display text-2xl text-navy">{showPricing ? 'These items are priced on request' : 'Pricing is shared on request'}</p>
            <p className="text-[14px] text-charcoal/65 mt-2">Send your list to our team — we&apos;ll reply with wholesale pricing, delivery and an invoice {user ? 'in your account' : 'by email'}.</p>
            <ul className="mt-5 divide-y divide-navy/5 border-y border-navy/5">
              {[...lines, ...quoteOnly].map(({ p, qty }) => <li key={p.id} className="py-2.5 flex justify-between text-[14px]"><span className="text-navy font-semibold">{p.name}</span><span className="text-charcoal/60">× {qty}</span></li>)}
            </ul>
            {isGuest && (
              <div className="grid sm:grid-cols-2 gap-4 mt-5">
                <GInput id="q-name" label="Full name *" value={guest.name} onChange={(v) => setGuest({ ...guest, name: v })} error={gErr.name} />
                <GInput id="q-email" label="Email *" type="email" value={guest.email} onChange={(v) => setGuest({ ...guest, email: v })} error={gErr.email} />
                <GInput id="q-phone" label="Phone" value={guest.phone} onChange={(v) => setGuest({ ...guest, phone: v })} />
                <GInput id="q-company" label="Business name" value={guest.company} onChange={(v) => setGuest({ ...guest, company: v })} />
              </div>
            )}
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="dash-input resize-y mt-5" placeholder="Quantities, delivery city, anything else we should know…" />
            {error && <p role="alert" className="mt-4 text-[13px] font-semibold text-[#B4432F] bg-[#F8E7E3] rounded-xl px-4 py-3">{error}</p>}
            <button type="button" onClick={requestQuote} disabled={isAdmin || isVendor} className="btn btn-gold w-full sm:w-auto mt-5">Send quote request <ArrowRight className="mv" /></button>
          </div>
        ) : !lines.length ? (
          <div className="dash-card mt-8 text-center py-16 px-6">
            <span className="mx-auto w-16 h-16 rounded-full bg-ivory grid place-items-center text-gold"><ShoppingBag className="w-7 h-7" strokeWidth={1.6} /></span>
            <p className="font-display text-2xl text-navy mt-5">Your cart is empty</p>
            <p className="text-[14px] text-charcoal/60 mt-2">Add products from the store to check out.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/#shop" className="btn btn-navy">Continue shopping <ArrowRight className="mv" /></Link>
              <Link href="/account/orders" className="btn btn-line-dark">View my orders</Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid lg:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
            <div className="space-y-5">
              {pendingRetailer && (
                <div className="rounded-2xl bg-gold-pale border border-gold/30 p-4 sm:p-5 flex gap-3">
                  <Clock3 className="w-5 h-5 text-[#8a6417] shrink-0 mt-0.5" />
                  <div className="text-[13.5px] text-[#6d4f12]">
                    <p className="font-extrabold">Your trade account is awaiting approval</p>
                    <p className="mt-0.5">Ordering unlocks once approved. Meanwhile you can send this cart to our team as a bulk quote request.</p>
                  </div>
                </div>
              )}
              {(isAdmin || isVendor) && (
                <div className="rounded-2xl bg-[#E6EEF8] p-4 text-[13.5px] text-navy-600">You're signed in as {isAdmin ? 'an admin' : 'a supplier'}. Sign in with a customer account — or sign out to check out as a guest — to place an order.</div>
              )}

              <div id="step-location" className="scroll-mt-6">
                <Step n="1" title="Delivery location">
                  {location ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border-[1.5px] border-emerald bg-[#F2F8F5] p-4">
                      <span className="w-11 h-11 rounded-xl bg-emerald text-white grid place-items-center shrink-0"><MapPin className="w-5 h-5" strokeWidth={1.8} /></span>
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-navy text-[15px]">{locLabel}{savedLoc?.postcode ? ` ${savedLoc.postcode}` : ''}</p>
                        <p className="text-[12.5px] text-charcoal/60">Delivery is priced by distance to your address.</p>
                      </div>
                      <button type="button" onClick={() => setLocOpen(true)} className="dash-btn dash-btn-ghost shrink-0">Change</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setLocOpen(true)} className="w-full flex items-center gap-4 rounded-2xl border-[1.5px] border-dashed border-gold bg-gold-pale/40 p-4 text-left">
                      <span className="w-11 h-11 rounded-xl bg-gold-soft text-navy grid place-items-center shrink-0"><MapPin className="w-5 h-5" strokeWidth={1.8} /></span>
                      <span className="flex-1"><span className="block font-extrabold text-navy">Choose your delivery location</span><span className="block text-[12.5px] text-charcoal/60">We need your city to work out delivery.</span></span>
                      <ArrowRight className="w-5 h-5 text-navy" />
                    </button>
                  )}
                </Step>
              </div>

              {isGuest && (
                <div id="step-details" className="scroll-mt-6">
                  <Step n="2" title="Your details">
                    <div className="rounded-xl bg-ivory border border-navy/5 px-4 py-3 mb-5 flex flex-wrap items-center justify-between gap-2 text-[13px]">
                      <span className="flex items-center gap-2 text-charcoal/70"><UserRound className="w-4 h-4 text-navy/50" /> Checking out as a guest — no account needed.</span>
                      <Link href="/login?next=/checkout" className="font-bold text-emerald hover:text-navy">Have an account? Sign in</Link>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <GInput id="g-name" label="Full name *" value={guest.name} onChange={(v) => setGuest({ ...guest, name: v })} error={gErr.name} autoComplete="name" />
                      <GInput id="g-email" label="Email *" type="email" value={guest.email} onChange={(v) => setGuest({ ...guest, email: v })} error={gErr.email} autoComplete="email" />
                      <GInput id="g-phone" label="Phone *" type="tel" value={guest.phone} onChange={(v) => setGuest({ ...guest, phone: v })} error={gErr.phone} autoComplete="tel" />
                      <GInput id="g-company" label="Business name (optional)" value={guest.company} onChange={(v) => setGuest({ ...guest, company: v })} autoComplete="organization" />
                    </div>
                  </Step>
                </div>
              )}

              <div id="step-address" className="scroll-mt-6">
                <Step n={isGuest ? '3' : '2'} title="Delivery address">
                  {isGuest ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <GInput id="g-line1" label="Street address *" className="sm:col-span-2" value={gAddr.line1} onChange={(v) => setGAddr({ ...gAddr, line1: v })} error={gErr.line1} autoComplete="street-address" placeholder="Unit / street" />
                      <GInput id="g-city" label="City *" value={gAddr.city} onChange={(v) => setGAddr({ ...gAddr, city: v })} error={gErr.city} />
                      <div className="grid grid-cols-2 gap-4">
                        <label className="block"><span className="dash-label">State *</span>
                          <select className={`dash-input ${gErr.state ? '!border-[#B4432F]' : ''}`} value={gAddr.state} onChange={(e) => setGAddr({ ...gAddr, state: e.target.value })}>
                            <option value="">—</option>{STATES.map((st) => <option key={st}>{st}</option>)}
                          </select>
                        </label>
                        <GInput id="g-postcode" label="ZIP code *" value={gAddr.postcode} onChange={(v) => setGAddr({ ...gAddr, postcode: v })} error={gErr.postcode} inputMode="numeric" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-[13px] text-charcoal/60 mb-4 leading-relaxed">
                        <Building2 className="w-4 h-4 inline -mt-0.5 mr-1.5" />Delivering to <b className="text-navy">{user.company || user.name}</b> · {user.email}
                      </p>
                      <AddressPicker value={addressId} onChange={setAddressId} />
                    </>
                  )}
                  {mismatch && (
                    <div className="mt-4 rounded-xl bg-gold-pale border border-gold/30 px-4 py-3 text-[13px] text-[#6d4f12] flex flex-wrap items-center justify-between gap-3">
                      <span>This address is in <b>{mismatch.state}</b> but your delivery location is <b>{locationLabel(location)}</b>.</span>
                      <button type="button" className="font-extrabold text-navy hover:text-emerald" onClick={() => setDeliveryLocation({ locationId: mismatch.id, suburb: address.city, postcode: address.postcode })}>Switch to {mismatch.city}</button>
                    </div>
                  )}
                </Step>
              </div>

              <Step n={isGuest ? '4' : '3'} title="How it works">
                <ol className="grid sm:grid-cols-3 gap-3 text-[13px]">
                  {[[Clock3, 'You send the request', 'No payment now. Stock is held for you.'], [FileText, 'We confirm & invoice', 'Our team confirms prices, delivery and sends your invoice.'], [Truck, 'We deliver', 'Pay by bank transfer per the invoice. We deliver to your door.']].map(([Icon, t, d]) => (
                    <li key={t} className="rounded-2xl border border-navy/10 bg-white p-4">
                      <Icon className="w-5 h-5 text-emerald" strokeWidth={1.8} />
                      <p className="font-extrabold text-navy mt-2">{t}</p>
                      <p className="text-charcoal/60 mt-0.5">{d}</p>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 text-[12px] text-charcoal/55 flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> Delivery is {rateLabel(settings.delivery)}{Number(settings.delivery?.baseFee) ? ` + $${Number(settings.delivery.baseFee).toFixed(2)} per shipment` : ''}, by road distance.</p>
              </Step>

              <Step n={isGuest ? '5' : '4'} title="Order notes">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="dash-input resize-y" placeholder="Delivery instructions, loading dock hours, purchase order number…" />
              </Step>
            </div>

            {/* Summary */}
            <aside className="dash-card lg:sticky lg:top-6 overflow-hidden">
              <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-navy/5 flex items-center justify-between">
                <h2 className="font-display text-[1.35rem] text-navy">Order summary</h2>
                <span className="text-[12px] font-bold text-charcoal/50">{lines.reduce((a, l) => a + l.qty, 0)} items</span>
              </div>
              <ul className="divide-y divide-navy/5 max-h-[420px] overflow-y-auto">
                {lines.map(({ p, qty }) => (
                  <li key={p.id} className="flex gap-3 px-5 sm:px-6 py-4">
                    <img src={productImg(p)} alt="" className="w-16 h-16 rounded-xl object-contain bg-ivory p-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-bold text-navy leading-snug line-clamp-2">{p.name}</p>
                      <p className="text-[11.5px] text-charcoal/50 mt-0.5 truncate">{sizeLine(p)}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="qty">
                          <button type="button" onClick={() => setQty(p.id, qty - 1)} aria-label={`Decrease ${p.name}`}><Minus className="w-3.5 h-3.5" /></button>
                          <span>{qty}</span>
                          <button type="button" onClick={() => setQty(p.id, qty + 1)} aria-label={`Increase ${p.name}`}><Plus className="w-3.5 h-3.5" /></button>
                        </div>
                        <span className="text-[14px] font-extrabold text-navy">{money(p.price * qty)}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeFromCart(p.id)} className="self-start text-charcoal/35 hover:text-[#B4432F] p-1" aria-label={`Remove ${p.name}`}><Trash2 className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
              <dl className="px-5 sm:px-6 py-4 space-y-2 text-[13.5px] border-t border-navy/5 bg-ivory/50">
                <div className="flex justify-between"><dt className="text-charcoal/60">Subtotal</dt><dd className="font-bold text-navy">{money(subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-charcoal/60">Delivery{estimate?.miles ? <span className="text-charcoal/45"> · ~{Math.round(estimate.miles)} mi</span> : ''}</dt><dd className="font-bold text-navy">{estimating ? '…' : shipping === null ? 'Add address' : shipping ? money(shipping) : 'Free'}</dd></div>
                {estimate?.freeOver > 0 && shipping > 0 && subtotal < estimate.freeOver && <p className="text-[11.5px] text-emerald font-semibold">Add {money(estimate.freeOver - subtotal)} more for free delivery</p>}
                {unavailable > 0 && <p className="text-[11.5px] text-[#8a6417] font-semibold">{unavailable} item{unavailable > 1 ? 's are' : ' is'} low on stock — our team will confirm availability.</p>}
                {quoteOnly.length > 0 && <p className="text-[11.5px] text-charcoal/55">{quoteOnly.length} price-on-request item{quoteOnly.length > 1 ? 's stay' : ' stays'} in your cart — send {quoteOnly.length > 1 ? 'them' : 'it'} as a quote request after this order.</p>}
                <div className="flex justify-between pt-3 mt-1 border-t border-navy/10 text-[16px]"><dt className="font-extrabold text-navy">Estimated total</dt><dd className="font-extrabold text-navy">{money(total)} <span className="text-[11px] font-bold text-charcoal/45">USD</span></dd></div>
                <p className="text-[11px] text-charcoal/50">Final prices are confirmed on your invoice.</p>
              </dl>
              <div className="px-5 sm:px-6 pb-6 pt-1 space-y-2.5">
                {error && <p role="alert" className="text-[13px] font-semibold text-[#B4432F] bg-[#F8E7E3] rounded-xl px-4 py-3">{error}</p>}
                <button type="button" onClick={place} disabled={pendingRetailer || isAdmin || isVendor || placing} className="btn btn-gold w-full">
                  {placing ? 'Sending…' : 'Send order request'} <ArrowRight className="mv" />
                </button>
                {(isGuest || user.role === 'customer') && (
                  <button type="button" onClick={requestQuote} className="btn btn-line-dark w-full !min-h-[44px] !py-2.5">Request a bulk quote instead</button>
                )}
                <p className="text-[11.5px] text-center text-charcoal/50">No payment now. By sending this request you agree to our Terms &amp; Conditions.</p>
              </div>
            </aside>
          </div>
        )}
      </main>
      <LocationModal open={locOpen} onClose={() => setLocOpen(false)} />
      {lines.length > 0 && showPricing && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-navy/10 px-4 py-3 flex items-center gap-3 shadow-[0_-12px_30px_-20px_rgba(11,35,71,.4)]">
          <div className="min-w-0">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[.14em] text-charcoal/50">Total</p>
            <p className="text-[17px] font-extrabold text-navy leading-tight">{money(total)}</p>
          </div>
          <button type="button" onClick={place} disabled={pendingRetailer || isAdmin || isVendor || placing} className="btn btn-gold flex-1 !min-h-[46px] !py-2.5">Send request <ArrowRight className="mv" /></button>
        </div>
      )}
    </div>
  );
}
