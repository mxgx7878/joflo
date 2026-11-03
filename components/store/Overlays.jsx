'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore, useStoreReady, useCurrentUser } from '@/lib/store';
import { productImg } from '@/lib/catalogue';
import { money, priced, catLine, sizeLine } from '@/lib/format';
import { useUI } from './ui';
import { FilterLink, CosLink, useCatalogue, useProductActions } from './shared';
import { accountHref, dashLabel, useCounts } from './SiteHeader';
import { X, ChevronDown, UserRound, Lock, ShoppingBag, Heart, Minus, Plus, Trash2, PackageCheck, Info, Mail, ArrowRight, CircleCheck } from './icons';

/* Global behaviour: Escape closes, body scroll lock, focus the panel */
export function useOverlayBehaviour() {
  const panel = useUI((s) => s.panel);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') useUI.getState().closeAll(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    document.body.classList.toggle('lock', !!panel);
    if (panel) {
      const id = { menu: 'menuDrawer', cart: 'cartDrawer', wish: 'wishDrawer', quick: 'quickView', enquiry: 'enquiry' }[panel];
      const t = setTimeout(() => document.getElementById(id)?.querySelector('[data-close], button, a, input')?.focus({ preventScroll: true }), 60);
      return () => clearTimeout(t);
    }
  }, [panel]);
}

export function Scrim() {
  const panel = useUI((s) => s.panel);
  const closeAll = useUI((s) => s.closeAll);
  return <div className={`scrim fixed inset-0 z-[90] bg-navy-950/55 backdrop-blur-[2px] ${panel ? 'open' : ''}`} aria-hidden="true" onClick={closeAll} />;
}

/* ---------------- Mobile menu ---------------- */
export function MobileMenu() {
  const open = useUI((s) => s.panel === 'menu');
  const { closeAll, openEnquiry } = useUI.getState();
  const { categories, departments } = useCatalogue();
  const ready = useStoreReady();
  const user = useCurrentUser();
  const u = ready ? user : null;
  const cats = (d) => categories.filter((c) => c.dept === d && c.status !== 'hidden');
  const row = 'flex items-center justify-between py-3.5 border-b border-navy/10 font-bold text-navy';
  return (
    <aside id="menuDrawer" className={`drawer left fixed top-0 bottom-0 left-0 z-[100] w-[88%] max-w-[380px] bg-white flex flex-col ${open ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Menu" aria-hidden={!open}>
      <div className="flex items-center justify-between px-5 h-[76px] border-b border-navy/10">
        <span className="logo block h-[54px]"><img src="/brand/logo.webp" alt="JOLOF logo" className="h-full w-auto block" /></span>
        <button className="icon-btn border border-navy/10" data-close aria-label="Close menu" onClick={closeAll}><X /></button>
      </div>
      <nav className="flex-1 overflow-y-auto px-5 py-4" aria-label="Mobile">
        <a href="/#top" className={row} onClick={closeAll}>Home</a>
        <FilterLink dept="" className={row}>Shop All</FilterLink>
        {departments.map((d, i) => (
          <details key={d.id} className="border-b border-navy/10 group" open={i === 0}>
            <summary className="flex items-center justify-between py-3.5 font-bold text-navy cursor-pointer list-none">{d.name} <ChevronDown className="w-4 h-4 transition group-open:rotate-180" /></summary>
            <div className="pb-3 pl-3 space-y-1 text-[14.5px]">
              {d.kind === 'trading' ? (
                <>
                  {cats(d.name).map((c) => <a key={c.id} href="/#trading" className="block py-1.5 text-charcoal/70" onClick={closeAll}>{c.name}</a>)}
                  <a href="/#trading" className="block py-1.5 font-bold text-emerald" onClick={closeAll}>View all commodities</a>
                  <Link href="/trading" className="block py-1.5 font-bold text-emerald" onClick={closeAll}>About JOLOF TRADE CENTER</Link>
                </>
              ) : (
                <>
                  {cats(d.name).map((c) => <FilterLink key={c.id} dept={d.name} cat={c.name} className="block py-1.5 text-charcoal/70">{c.name}</FilterLink>)}
                  <FilterLink dept={d.name} className="block py-1.5 font-bold text-emerald">Shop all {d.name}</FilterLink>
                </>
              )}
            </div>
          </details>
        ))}
        <a href="/#new-arrivals" className={row} onClick={closeAll}>New Arrivals <span className="text-[9px] font-extrabold bg-gold-soft rounded-full px-2 py-0.5">NEW</span></a>
        <a href="/#about" className={row} onClick={closeAll}>About Us</a>
        <button type="button" className={`w-full text-left ${row}`} onClick={() => openEnquiry({ type: 'contact' })}>Contact</button>
      </nav>
      <div className="p-5 bg-ivory border-t border-navy/10 space-y-3">
        <button type="button" className="btn btn-gold w-full" onClick={() => openEnquiry({ type: 'bulk' })}>Request Bulk Pricing</button>
        <Link href={accountHref(u)} className="btn btn-line-dark w-full"><UserRound />{u ? (dashLabel(u) || 'My Account') : 'Sign in / Register'}</Link>
      </div>
    </aside>
  );
}

/* ---------------- Cart drawer ---------------- */
export function CartDrawer() {
  const open = useUI((s) => s.panel === 'cart');
  const { closeAll, openEnquiry } = useUI.getState();
  const router = useRouter();
  const ready = useStoreReady();
  const cart = useStore((s) => s.cart);
  const products = useStore((s) => s.products);
  const setQty = useStore((s) => s.setQty);
  const removeFromCart = useStore((s) => s.removeFromCart);
  const { cartCount, cartTotal } = useCounts();
  const showPricing = useStore((s) => s.settings.showPricing !== false);
  const rows = ready ? Object.entries(cart).map(([id, q]) => ({ p: products.find((x) => x.id === id), q })).filter((r) => r.p) : [];
  const buyable = showPricing && rows.some((r) => priced(r.p));

  return (
    <aside id="cartDrawer" className={`drawer right fixed top-0 bottom-0 right-0 z-[100] w-full sm:w-[440px] bg-white flex flex-col ${open ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Shopping cart" aria-hidden={!open}>
      <div className="flex items-center justify-between px-6 h-[76px] border-b border-navy/10">
        <h2 className="font-display text-2xl text-navy">Your Cart <span className="font-sans text-sm text-charcoal/50 font-semibold">{cartCount ? `(${cartCount} item${cartCount === 1 ? '' : 's'})` : ''}</span></h2>
        <button className="icon-btn border border-navy/10" data-close aria-label="Close cart" onClick={closeAll}><X /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-6">
        {rows.length ? rows.map(({ p, q }) => (
          <div key={p.id} className="flex gap-4 py-5 border-b border-navy/10">
            <img src={productImg(p)} alt="" className="w-[84px] h-[84px] rounded-xl object-contain bg-white border border-navy/10" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-extrabold tracking-[.16em] uppercase text-gold">{p.dept}</p>
              <p className="font-bold text-navy leading-snug">{p.name}</p>
              <p className="text-[12px] text-charcoal/55">{p.size} · {priced(p) ? money(p.price) : 'Price on request'}</p>
              <div className="mt-3 flex items-center justify-between">
                <div className="qty">
                  <button type="button" aria-label="Decrease quantity" onClick={() => setQty(p.id, q - 1)}><Minus width={14} height={14} /></button>
                  <span aria-label="Quantity">{q}</span>
                  <button type="button" aria-label="Increase quantity" onClick={() => setQty(p.id, q + 1)}><Plus width={14} height={14} /></button>
                </div>
                <span className="font-extrabold text-navy">{priced(p) ? money(p.price * q) : <span className="text-emerald text-[12.5px]">Quote</span>}</span>
              </div>
            </div>
            <button type="button" className="self-start text-charcoal/40 hover:text-[#B4432F] w-8 h-8 grid place-items-center" aria-label={`Remove ${p.name}`} onClick={() => removeFromCart(p.id)}><Trash2 className="w-[18px] h-[18px]" /></button>
          </div>
        )) : (
          <div className="h-full flex flex-col items-center justify-center text-center py-16">
            <span className="w-20 h-20 rounded-full bg-ivory grid place-items-center text-gold"><ShoppingBag className="w-9 h-9" /></span>
            <p className="font-display text-2xl text-navy mt-6">Your cart is empty</p>
            <p className="text-charcoal/60 mt-2 text-sm">Browse food, cosmetics and trading products to get started.</p>
            <FilterLink dept="" className="btn btn-navy mt-7">Start Shopping</FilterLink>
          </div>
        )}
      </div>
      {rows.length > 0 && (
        <div className="border-t border-navy/10 p-6 bg-ivory">
          {buyable ? (<>
            <div className="flex items-center justify-between"><span className="font-bold text-navy">Subtotal</span><span className="font-extrabold text-xl text-navy">{money(cartTotal)}</span></div>
            <p className="text-[12px] text-charcoal/55 mt-1">Prices in USD. Delivery is calculated by distance at checkout. Cash on delivery — nothing to pay online.</p>
            <button type="button" className="btn btn-navy w-full mt-5" onClick={() => { closeAll(); router.push('/checkout'); }}><Lock />Checkout</button>
          </>) : (
            <p className="text-[13px] text-charcoal/65">These items are priced on request — send them to our team and we&apos;ll reply with a quote.</p>
          )}
          <button type="button" className="btn btn-line-dark w-full mt-3" onClick={() => openEnquiry({ type: 'cart' })}>Request Bulk Quote for Cart</button>
        </div>
      )}
    </aside>
  );
}

/* ---------------- Wishlist drawer ---------------- */
export function WishDrawer() {
  const open = useUI((s) => s.panel === 'wish');
  const closeAll = useUI((s) => s.closeAll);
  const ready = useStoreReady();
  const wishIds = useStore((s) => s.wish);
  const products = useStore((s) => s.products);
  const toggleWishS = useStore((s) => s.toggleWish);
  const { add, wish, enquire } = useProductActions();
  const list = ready ? wishIds.map((id) => products.find((p) => p.id === id)).filter(Boolean) : [];
  return (
    <aside id="wishDrawer" className={`drawer right fixed top-0 bottom-0 right-0 z-[100] w-full sm:w-[440px] bg-white flex flex-col ${open ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Wishlist" aria-hidden={!open}>
      <div className="flex items-center justify-between px-6 h-[76px] border-b border-navy/10">
        <h2 className="font-display text-2xl text-navy">Wishlist <span className="font-sans text-sm text-charcoal/50 font-semibold">{list.length ? `(${list.length})` : ''}</span></h2>
        <button className="icon-btn border border-navy/10" data-close aria-label="Close wishlist" onClick={closeAll}><X /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-6">
        {list.length ? list.map((p) => (
          <div key={p.id} className="flex gap-4 py-5 border-b border-navy/10">
            <img src={productImg(p)} alt="" className="w-[84px] h-[84px] rounded-xl object-contain bg-white border border-navy/10" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-extrabold tracking-[.16em] uppercase text-gold">{p.dept}</p>
              <p className="font-bold text-navy leading-snug">{p.name}</p>
              <p className="text-[12px] text-charcoal/55">{sizeLine(p)} · {priced(p) ? money(p.price) : 'Price on request'}</p>
              <div className="mt-3 flex gap-2">
                {priced(p) ? (
                  <button type="button" className="h-9 px-4 rounded-full bg-navy text-white text-[12px] font-bold hover:bg-emerald transition" onClick={() => { toggleWishS(p.id); add(p.id); }}>Move to Cart</button>
                ) : (
                  <button type="button" className="h-9 px-4 rounded-full bg-gold-soft text-navy text-[12px] font-bold hover:bg-gold transition" onClick={() => enquire(p.id)}>Enquire Now</button>
                )}
                <button type="button" className="h-9 px-3 rounded-full text-[12px] font-bold text-charcoal/60 hover:text-[#B4432F]" onClick={() => wish(p.id)}>Remove</button>
              </div>
            </div>
          </div>
        )) : (
          <div className="h-full flex flex-col items-center justify-center text-center py-16">
            <span className="w-20 h-20 rounded-full bg-ivory grid place-items-center text-gold"><Heart className="w-9 h-9" /></span>
            <p className="font-display text-2xl text-navy mt-6">No saved items yet</p>
            <p className="text-charcoal/60 mt-2 text-sm">Tap the heart on any product to save it here.</p>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ---------------- Quick view ---------------- */
export function QuickView() {
  const open = useUI((s) => s.panel === 'quick');
  const quickId = useUI((s) => s.quickId);
  const { closeAll, openEnquiry } = useUI.getState();
  const p = useStore((s) => s.products.find((x) => x.id === quickId));
  const on = useStore((s) => s.wish.includes(quickId));
  const { add, wish, enquire } = useProductActions();
  const [qty, setQty] = useState(1);
  useEffect(() => { setQty(1); }, [quickId, open]);

  return (
    <div id="quickView" className={`modal fixed inset-0 z-[110] grid place-items-center p-3 sm:p-6 ${open ? 'open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="qvName" aria-hidden={!open}>
      <div className="absolute inset-0" onClick={closeAll} />
      <div className="panel relative w-full max-w-[980px] max-h-[92vh] overflow-y-auto bg-white rounded-3xl grid md:grid-cols-2">
        <button className="icon-btn bg-white shadow absolute right-3 top-3 z-10" data-close aria-label="Close quick view" onClick={closeAll}><X /></button>
        {p && (
          <>
            <div className="bg-white border-b md:border-b-0 md:border-r border-navy/10 aspect-square md:aspect-auto md:min-h-[540px] relative">
              <img src={productImg(p)} alt={p.name} className="absolute inset-0 w-full h-full object-contain p-6" />
            </div>
            <div className="p-6 sm:p-10 flex flex-col">
              <p className="text-[11px] font-extrabold tracking-[.2em] uppercase text-gold">{catLine(p)}</p>
              <h2 id="qvName" className="font-display text-[2rem] text-navy mt-2 leading-tight">{p.name}</h2>
              <p className="mt-2 text-charcoal/60 text-sm">{p.price === null ? [p.size && `Size: ${p.size}`, p.pack && `Wholesale pack: ${p.pack}`].filter(Boolean).join(' · ') : `Packaging: ${p.size}`}</p>
              <p className="mt-5 flex items-baseline gap-2">
                <span className="text-[1.7rem] font-extrabold text-navy">{priced(p) ? money(p.price) : 'Price on request'}</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal/45">{p.real ? 'Wholesale price per case · USD' : priced(p) ? 'Sample price · USD' : 'Wholesale pricing'}</span>
              </p>
              <p className="mt-5 text-charcoal/70 leading-relaxed">{p.desc}</p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                {priced(p) && (
                  <div className="qty">
                    <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus className="w-4 h-4" /></button>
                    <span aria-live="polite">{qty}</span>
                    <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(999, q + 1))}><Plus className="w-4 h-4" /></button>
                  </div>
                )}
                <button type="button" className="btn btn-gold flex-1" onClick={() => { if (!priced(p)) { enquire(p.id); return; } add(p.id, qty); closeAll(); }}>
                  {priced(p) ? <><ShoppingBag />Add to Cart</> : <><Mail />Enquire Now</>}
                </button>
                <button type="button" className={`icon-btn border border-navy/15 !w-12 !h-12 ${on ? '!text-[#B4432F]' : ''}`} aria-label="Add to wishlist" aria-pressed={on} onClick={() => wish(p.id)}>
                  <Heart style={{ fill: on ? '#B4432F' : 'none' }} />
                </button>
              </div>
              {priced(p) && (
                <button type="button" className="mt-4 text-[13px] font-bold text-emerald inline-flex items-center gap-2 self-start hover:underline"
                  onClick={() => openEnquiry({ type: 'product', productId: p.id, dept: p.dept, kicker: 'Wholesale', title: 'Request Bulk Pricing', message: `Bulk pricing for: ${p.name}\nQuantity: ` })}>
                  <PackageCheck className="w-4 h-4" />Request bulk pricing for this product
                </button>
              )}
              <div className="mt-auto pt-8 text-[12px] text-charcoal/50 flex items-start gap-2"><Info className="w-4 h-4 shrink-0 mt-0.5" />Demonstration product shown to illustrate the shopping experience. Final products, specifications and pricing will be supplied by JOLOF TRADING.</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- Enquiry modal ---------------- */


export function EnquiryModal() {
  const open = useUI((s) => s.panel === 'enquiry');
  const enquiry = useUI((s) => s.enquiry);
  const closeAll = useUI((s) => s.closeAll);
  const ready = useStoreReady();
  const user = useCurrentUser();
  const products = useStore((s) => s.products);
  const commodities = useStore((s) => s.commodities);
  const DEPTS = [...useCatalogue().departments.map((d) => d.name), 'Multiple departments'];
  const cart = useStore((s) => s.cart);
  const submitInquiry = useStore((s) => s.submitInquiry);

  const [f, setF] = useState({});
  const [err, setErr] = useState({});
  const [done, setDone] = useState(null);
  const formRef = useRef(null);

  // Resolve the enquiry context into a type + defaults whenever the modal is (re)opened
  const ctx = useMemo(() => {
    if (!enquiry) return { type: 'bulk' };
    let { type } = enquiry;
    const cartIds = Object.keys(cart).filter((id) => products.some((p) => p.id === id));
    if (type === 'cart' && !cartIds.length) type = 'bulk';
    const p = enquiry.productId ? products.find((x) => x.id === enquiry.productId) : null;
    const base = {
      contact: { kicker: 'Contact', title: 'Contact Our Team', dept: '', message: '' },
      bulk: { kicker: 'Wholesale', title: 'Request Bulk Pricing', dept: enquiry.dept || '', message: '' },
      cart: (() => {
        const rows = cartIds.map((id) => ({ p: products.find((x) => x.id === id), q: cart[id] }));
        const depts = [...new Set(rows.map((r) => r.p.dept))];
        return { kicker: 'Wholesale', title: 'Request Bulk Quote for Cart', dept: depts.length === 1 ? depts[0] : 'Multiple departments', message: rows.map((r) => `${r.q} × ${r.p.name} (${r.p.size})`).join('\n'), rows };
      })(),
      product: p ? { kicker: `${p.dept} Wholesale`, title: 'Enquire Now', dept: p.dept, message: `Product: ${p.name} (${sizeLine(p)})\n`, product: p } : { kicker: 'Wholesale', title: 'Enquire Now', dept: '', message: '' },
      commodity: { kicker: 'Commodity Trading', title: 'Request a Quote', dept: enquiry.dept || 'Trading', message: '' },
    }[type];
    return { type, ...base, ...(enquiry.kicker ? { kicker: enquiry.kicker } : {}), ...(enquiry.title ? { title: enquiry.title } : {}), ...(enquiry.message ? { message: enquiry.message } : {}) };
  }, [enquiry, cart, products]);

  useEffect(() => {
    if (!open || !enquiry) return;
    const u = ready && user?.role === 'customer' ? user : null;
    const c = commodities.find((x) => x.id === enquiry.commodityId);
    setF({
      name: u?.name || '', company: u?.company || '', email: u?.email || '', phone: u?.phone || '',
      dept: ctx.dept || '',
      message: ctx.type === 'commodity' ? (c ? `Commodity: ${c.name}\nPlease quote price and availability.` : '') : ctx.message || '',
      qty: ctx.type === 'product' ? '1' : '',
      commodityId: c?.id || '',
      mt: c ? String(c.minQty || '') : '',
      port: '',
    });
    setErr({});
    setDone(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enquiry?.key, open]);

  const set = (k) => (e) => { const v = e.target.value; setF((x) => ({ ...x, [k]: v })); if (err[k]) setErr((x) => ({ ...x, [k]: false })); };

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const onSubmit = async (e) => {
    e.preventDefault();
    const em = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const bad = {
      name: (f.name || '').trim().length < 2,
      email: !em.test((f.email || '').trim()),
      dept: !f.dept,
      message: (f.message || '').trim().length < 10,
      commodityId: ctx.type === 'commodity' && !f.commodityId,
    };
    setErr(bad);
    const first = Object.keys(bad).find((k) => bad[k]);
    if (first) { formRef.current?.querySelector(`[name="${first}"]`)?.focus(); return; }

    let items = [];
    let trade = null;
    if (ctx.type === 'product' && ctx.product) items = [{ productId: ctx.product.id, name: ctx.product.name, qty: Math.max(1, parseInt(f.qty, 10) || 1), unit: 'cases' }];
    if (ctx.type === 'cart') items = ctx.rows.map((r) => ({ productId: r.p.id, name: r.p.name, qty: r.q, unit: 'units' }));
    if (ctx.type === 'commodity') {
      const c = commodities.find((x) => x.id === f.commodityId);
      items = c ? [{ commodityId: c.id, name: c.name, qty: Number(f.mt) || 0, unit: 'MT' }] : [];
      trade = { port: f.port.trim(), incoterm: '', frequency: '', targetPrice: null };
    }
    setSending(true); setSendError('');
    const res = await submitInquiry({ type: ctx.type, name: f.name.trim(), company: f.company.trim(), email: f.email.trim(), phone: f.phone.trim(), dept: f.dept, message: f.message.trim(), items, trade });
    setSending(false);
    if (res.ok) setDone(res.id); else setSendError(res.error || 'Could not send your enquiry.');
  };

  const fld = (k, label, input, span = '') => (
    <div className={`field ${span} ${err[k] ? 'invalid' : ''}`}>
      <label htmlFor={`e-${k}`}>{label}</label>
      {input}
      {{ name: 'Please enter your name.', email: 'Please enter a valid email.', dept: 'Please select a department.', message: 'Please describe your requirements.', commodityId: 'Please choose a commodity.' }[k] && <p className="err">{{ name: 'Please enter your name.', email: 'Please enter a valid email.', dept: 'Please select a department.', message: 'Please describe your requirements.', commodityId: 'Please choose a commodity.' }[k]}</p>}
    </div>
  );
  const isCustomer = ready && user?.role === 'customer';

  return (
    <div id="enquiry" className={`modal fixed inset-0 z-[110] grid place-items-center p-3 sm:p-6 ${open ? 'open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="enqTitle" aria-hidden={!open}>
      <div className="absolute inset-0" onClick={closeAll} />
      <div className="panel relative w-full max-w-[680px] max-h-[92vh] overflow-y-auto bg-white rounded-3xl p-6 sm:p-10">
        <button className="icon-btn absolute right-3 top-3" data-close aria-label="Close" onClick={closeAll}><X /></button>
        {done ? (
          <div className="text-center py-6" role="status" aria-live="polite">
            <span className="mx-auto w-16 h-16 rounded-full bg-[#E3F2EA] grid place-items-center text-emerald"><CircleCheck className="w-8 h-8" /></span>
            <p className="kicker justify-center mt-6">Enquiry received</p>
            <h2 id="enqTitle" className="font-display text-[2rem] text-navy mt-2">Thank you, {f.name.split(' ')[0]}.</h2>
            <p className="mt-3 text-charcoal/65 max-w-[440px] mx-auto">Our team will review your enquiry and reply to <b className="text-navy">{f.email}</b>. Keep this reference for your records:</p>
            <p className="mt-5 inline-block rounded-2xl border border-gold/50 bg-gold-pale/50 px-6 py-3 font-extrabold text-navy tracking-wider">Reference {done}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {isCustomer
                ? <Link href="/account/quotes" className="btn btn-navy">Track it in your account <ArrowRight className="mv" /></Link>
                : <Link href="/register" className="btn btn-navy">Create an account to track replies <ArrowRight className="mv" /></Link>}
              <button type="button" className="btn btn-line-dark" onClick={closeAll}>Continue Shopping</button>
            </div>
          </div>
        ) : (
          <>
            <p className="kicker">{ctx.kicker}</p>
            <h2 id="enqTitle" className="font-display text-[2rem] text-navy mt-2">{ctx.title}</h2>
            <p className="text-charcoal/60 mt-2 text-[14.5px]">Tell us what you need and our team can review your enquiry.</p>
            {ctx.type === 'product' && ctx.product && (
              <div className="mt-6 flex items-center gap-4 rounded-2xl bg-ivory p-3">
                <img src={productImg(ctx.product)} alt="" className="w-14 h-14 rounded-xl object-contain bg-white border border-navy/10" />
                <div className="min-w-0"><p className="font-bold text-navy leading-snug">{ctx.product.name}</p><p className="text-[12px] text-charcoal/55">{sizeLine(ctx.product)}</p></div>
              </div>
            )}
            <form ref={formRef} className="mt-7 grid sm:grid-cols-2 gap-4" noValidate onSubmit={onSubmit}>
              {fld('name', 'Full Name *', <input id="e-name" name="name" autoComplete="name" value={f.name || ''} onChange={set('name')} aria-invalid={!!err.name} />)}
              {fld('company', 'Company', <input id="e-company" name="company" autoComplete="organization" value={f.company || ''} onChange={set('company')} />)}
              {fld('email', 'Email *', <input id="e-email" name="email" type="email" autoComplete="email" value={f.email || ''} onChange={set('email')} aria-invalid={!!err.email} />)}
              {fld('phone', 'Phone', <input id="e-phone" name="phone" type="tel" autoComplete="tel" value={f.phone || ''} onChange={set('phone')} />)}
              {ctx.type === 'commodity' ? (
                <>
                  {fld('commodityId', 'Commodity *', (
                    <select id="e-commodityId" name="commodityId" value={f.commodityId || ''} onChange={(e) => { const c = commodities.find((x) => x.id === e.target.value); setF((x) => ({ ...x, commodityId: e.target.value, mt: c && !x.mt ? String(c.minQty || '') : x.mt, message: x.message || (c ? `Commodity: ${c.name}\nPlease quote price and availability.` : '') })); setErr((x) => ({ ...x, commodityId: false })); }}>
                      <option value="">Select a commodity</option>
                      {commodities.filter((c) => c.status === 'active').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  ), 'sm:col-span-2')}
                  {fld('mt', 'Quantity (MT)', <input id="e-mt" name="mt" type="number" min="0" step="1" inputMode="numeric" value={f.mt || ''} onChange={set('mt')} placeholder="e.g. 25" />)}
                  {fld('port', 'Delivery port', <input id="e-port" name="port" value={f.port || ''} onChange={set('port')} placeholder="e.g. Port of Newark, NJ" />)}
                </>
              ) : (
                fld('dept', 'Department *', (
                  <select id="e-dept" name="dept" value={f.dept || ''} onChange={set('dept')} aria-invalid={!!err.dept}>
                    <option value="">Select a department</option>
                    {DEPTS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                ), ctx.type === 'product' ? '' : 'sm:col-span-2')
              )}
              {ctx.type === 'product' && fld('qty', 'Quantity (cases)', <input id="e-qty" name="qty" type="number" min="1" step="1" inputMode="numeric" value={f.qty || ''} onChange={set('qty')} />)}
              {fld('message', ctx.type === 'contact' ? 'Message *' : 'Products & Quantities *', <textarea id="e-message" name="message" rows={4} value={f.message || ''} onChange={set('message')} aria-invalid={!!err.message} />, 'sm:col-span-2')}
              <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
                {sendError && <p role="alert" className="text-[13px] font-semibold text-[#B4432F]">{sendError}</p>}
                <button className="btn btn-navy w-full sm:w-auto" disabled={sending}>{sending ? 'Sending…' : 'Send Enquiry'} <ArrowRight className="mv" /></button>
                {!isCustomer && <p className="text-[12.5px] text-charcoal/55">Have an account? <Link href="/login" className="font-bold text-emerald hover:underline">Sign in</Link> to track replies.</p>}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
