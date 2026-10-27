'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, Clock3, CreditCard, Landmark, Lock, Minus, Plus, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { useStore, useCurrentUser, useStoreReady, shippingFor, FREE_SHIPPING_FROM } from '@/lib/store';
import { productImg } from '@/lib/catalogue';
import { money, sizeLine } from '@/lib/format';
import { useToast } from '@/components/Providers';
import { MinimalHeader, AddressPicker, PageLoader } from '@/components/account/shared';

const METHODS = [
  { v: 'bank_transfer', icon: Landmark, t: 'Bank transfer', d: 'Pay by EFT after we confirm stock. Details on the next screen.' },
  { v: 'cod', icon: Truck, t: 'Pay on delivery', d: 'Pay the driver by card or cash when your order arrives.' },
  { v: 'card_demo', icon: CreditCard, t: 'Card (demo)', d: 'Card payments go live when the payment gateway is connected.' },
];

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
  const { setQty, removeFromCart, placeOrder, submitInquiry, clearCart } = useStore.getState();
  const [addressId, setAddressId] = useState(null);
  const [method, setMethod] = useState('bank_transfer');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (ready && !user && !placing) router.replace('/login?next=/checkout');
  }, [ready, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user && !addressId) { const d = user.addresses.find((a) => a.isDefault) || user.addresses[0]; if (d) setAddressId(d.id); }
  }, [user, addressId]);

  const lines = useMemo(() => Object.entries(cart).map(([id, qty]) => ({ p: products.find((x) => x.id === id), qty })).filter((l) => l.p && typeof l.p.price === 'number'), [cart, products]);
  const subtotal = Math.round(lines.reduce((s, l) => s + l.p.price * l.qty, 0) * 100) / 100;
  const shipping = shippingFor(subtotal);
  const total = subtotal + shipping;
  const pendingRetailer = user?.type === 'retailer' && user?.status === 'pending';
  const isAdmin = user?.role === 'admin';

  if (!ready || !user || placing) {
    return <div className="min-h-screen bg-ivory"><MinimalHeader secure /><div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-10"><PageLoader /></div></div>;
  }

  const place = () => {
    setError('');
    const address = user.addresses.find((a) => a.id === addressId);
    if (!address) { setError('Please choose or add a delivery address.'); document.getElementById('step-address')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    setPlacing(true);
    const r = placeOrder({ address, paymentMethod: method, notes });
    if (!r.ok) { setError(r.error); setPlacing(false); return; }
    router.push(`/checkout/success?order=${r.id}`);
  };

  const requestQuote = () => {
    const r = submitInquiry({
      type: 'cart', name: user.name, company: user.company, email: user.email, phone: user.phone,
      dept: [...new Set(lines.map((l) => l.p.dept))].join(', '),
      message: notes || 'Bulk quote requested for my cart.',
      items: lines.map((l) => ({ productId: l.p.id, name: l.p.name, qty: l.qty, unit: 'units' })),
    });
    clearCart();
    toast({ text: `Quote request ${r.id} sent — we'll reply in your account.` });
    router.push(`/account/quotes/${r.id}`);
  };

  return (
    <div className="min-h-screen bg-ivory">
      <MinimalHeader secure />
      <main className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-28 lg:py-12">
        <p className="kicker">Checkout</p>
        <h1 className="h-display text-navy text-[2rem] sm:text-[2.5rem] mt-2">Complete your order</h1>

        {!lines.length ? (
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
              {isAdmin && (
                <div className="rounded-2xl bg-[#E6EEF8] p-4 text-[13.5px] text-navy-600">You're signed in as an admin. Sign in with a customer account to place an order.</div>
              )}

              <div id="step-address" className="scroll-mt-6">
                <Step n="1" title="Delivery address">
                  <p className="text-[13px] text-charcoal/60 mb-4 leading-relaxed">
                    <Building2 className="w-4 h-4 inline -mt-0.5 mr-1.5" />Delivering to <b className="text-navy">{user.company || user.name}</b> · {user.email}
                  </p>
                  <AddressPicker value={addressId} onChange={setAddressId} />
                </Step>
              </div>

              <Step n="2" title="Payment method">
                <div className="grid gap-3">
                  {METHODS.map(({ v, icon: Icon, t, d }) => {
                    const on = method === v;
                    return (
                      <button key={v} type="button" onClick={() => setMethod(v)} aria-pressed={on}
                        className={`text-left flex items-center gap-4 rounded-2xl border-[1.5px] p-4 transition ${on ? 'border-emerald bg-[#F2F8F5] shadow-[0_0_0_3px_rgba(7,86,60,.12)]' : 'border-[#E2DED2] hover:border-navy/40 bg-white'}`}>
                        <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${on ? 'bg-emerald text-white' : 'bg-ivory text-navy'}`}><Icon className="w-5 h-5" strokeWidth={1.8} /></span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-extrabold text-navy text-[14.5px]">{t}</span>
                          <span className="block text-[12.5px] text-charcoal/60">{d}</span>
                        </span>
                        <span className={`w-5 h-5 rounded-full border-2 grid place-items-center shrink-0 ${on ? 'border-emerald' : 'border-navy/20'}`}>{on && <span className="w-2.5 h-2.5 rounded-full bg-emerald" />}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-4 text-[12px] text-charcoal/55 flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> Demo store — no payment is taken when you place this order.</p>
              </Step>

              <Step n="3" title="Order notes">
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
                <div className="flex justify-between"><dt className="text-charcoal/60">Delivery</dt><dd className="font-bold text-navy">{shipping ? money(shipping) : 'Free'}</dd></div>
                {shipping > 0 && <p className="text-[11.5px] text-emerald font-semibold">Add {money(FREE_SHIPPING_FROM - subtotal)} more for free delivery</p>}
                <div className="flex justify-between pt-3 mt-1 border-t border-navy/10 text-[16px]"><dt className="font-extrabold text-navy">Total</dt><dd className="font-extrabold text-navy">{money(total)} <span className="text-[11px] font-bold text-charcoal/45">USD</span></dd></div>
              </dl>
              <div className="px-5 sm:px-6 pb-6 pt-1 space-y-2.5">
                {error && <p role="alert" className="text-[13px] font-semibold text-[#B4432F] bg-[#F8E7E3] rounded-xl px-4 py-3">{error}</p>}
                <button type="button" onClick={place} disabled={pendingRetailer || isAdmin || placing} className="btn btn-gold w-full">
                  {placing ? 'Placing order…' : `Place order · ${money(total)}`} <ArrowRight className="mv" />
                </button>
                {user.role === 'customer' && (
                  <button type="button" onClick={requestQuote} className="btn btn-line-dark w-full !min-h-[44px] !py-2.5">Request a bulk quote instead</button>
                )}
                <p className="text-[11.5px] text-center text-charcoal/50">By placing this order you agree to our Terms &amp; Conditions.</p>
              </div>
            </aside>
          </div>
        )}
      </main>
      {lines.length > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-navy/10 px-4 py-3 flex items-center gap-3 shadow-[0_-12px_30px_-20px_rgba(11,35,71,.4)]">
          <div className="min-w-0">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[.14em] text-charcoal/50">Total</p>
            <p className="text-[17px] font-extrabold text-navy leading-tight">{money(total)}</p>
          </div>
          <button type="button" onClick={place} disabled={pendingRetailer || isAdmin || placing} className="btn btn-gold flex-1 !min-h-[46px] !py-2.5">Place order <ArrowRight className="mv" /></button>
        </div>
      )}
    </div>
  );
}
