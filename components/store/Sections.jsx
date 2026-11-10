'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { CATS, U, productImg } from '@/lib/catalogue';
import { useUI } from './ui';
import Link from 'next/link';
import { Reveal, FilterLink, CosLink, useCatalogue, useGoShop } from './shared';
import { ProductCard, RecoCard } from './ProductCard';
import { ArrowRight, Info, PackageSearch, ChevronLeft, ChevronRight, Wheat, Sparkles, Ship, Send } from './icons';

const H2 = 'h-display text-navy text-[2rem] sm:text-[2.7rem] mt-3';

/* ===================== SHOP BY DEPARTMENT ===================== */
function DeptCard({ n, title, text, cta, img, alt, grad, delay, href, onClick, as }) {
  const inner = (
    <>
      <img src={img} alt={alt} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      <div className={`absolute inset-0 bg-gradient-to-t ${grad} to-transparent`} />
      <div className="absolute top-5 left-5 text-[10px] font-extrabold tracking-[.25em] uppercase text-white bg-white/15 backdrop-blur rounded-full px-3 py-1.5">{n} · {title}</div>
      <div className="absolute bottom-0 left-0 right-0 p-7">
        <h3 className="font-display text-white text-[2rem] leading-tight">{title}</h3>
        <p className="text-white/75 text-[14.5px] mt-2 max-w-[300px]">{text}</p>
        <span className="go mt-6 inline-flex items-center gap-3 rounded-full border border-white/40 text-white text-[13px] font-bold px-5 h-12">{cta} <ArrowRight className="w-4 h-4 transition" /></span>
      </div>
    </>
  );
  return (
    <Reveal as="a" href={href} onClick={onClick} className="dept group relative rounded-3xl overflow-hidden aspect-[4/4.4] md:aspect-[3/4] block" style={delay ? { transitionDelay: delay } : undefined}>
      {inner}
    </Reveal>
  );
}

const NUM_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const GRADS = ['from-navy-950 via-navy-950/40', 'from-emerald-950 via-emerald-950/40', 'from-charcoal via-charcoal/40'];

export function Departments() {
  const goShop = useGoShop();
  const { departments } = useCatalogue();
  if (!departments.length) return null;
  const n = departments.length;
  const cols = n === 1 ? 'md:grid-cols-1' : n === 2 ? 'md:grid-cols-2' : n === 4 ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-3';
  return (
    <section id="departments" className="pt-20 lg:pt-28">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div><p className="kicker">Shop by Department</p><h2 className={H2}>{NUM_WORDS.at(n) || n} department{n === 1 ? '' : 's'}, one destination.</h2></div>
          <FilterLink dept="" className="text-[13px] font-bold text-navy inline-flex items-center gap-2 hover:text-emerald">View all products <ArrowRight className="w-4 h-4" /></FilterLink>
        </Reveal>
        <div className={`mt-10 grid ${cols} gap-5`}>
          {departments.map((d, i) => {
            const trading = d.kind === 'trading';
            const soon = d.status === 'coming_soon';
            return (
              <DeptCard key={d.id} n={String(i + 1).padStart(2, '0')} title={d.name} delay={i ? `${Math.min(i, 3) * 0.1}s` : undefined}
                href={trading ? '/trading' : '/#shop'}
                onClick={trading ? undefined : (e) => { e.preventDefault(); goShop({ dept: d.name }); }}
                text={soon ? `Coming soon. ${d.tagline}`.trim() : d.tagline}
                cta={trading ? 'Explore JOLOF TRADE CENTER' : `Shop ${d.name}`}
                img={d.image || 'https://images.unsplash.com/photo-1602018342965-6dd19657e145?auto=format&fit=crop&w=900&q=75'} alt=""
                grad={GRADS.at(i % GRADS.length)} />
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ===================== SHOP BY CATEGORY ===================== */
export function Categories() {
  const { products, catStatus, commodities, categories, departments } = useCatalogue();
  const live = new Set(departments.map((d) => d.name));
  const tradingNames = new Set(departments.filter((d) => d.kind === 'trading').map((d) => d.name));
  const known = new Set(CATS.map((c) => `${c.dept}|${c.cat}`));
  const extra = categories.filter((c) => live.has(c.dept) && !tradingNames.has(c.dept) && c.status !== 'hidden' && !known.has(`${c.dept}|${c.name}`))
    .map((c) => ({ dept: c.dept, cat: c.name, label: c.name, src: departments.find((d) => d.name === c.dept)?.image }));
  const tiles = [
    ...CATS.filter((c) => live.has(c.dept) && (tradingNames.has(c.dept) || catStatus(c.dept, c.cat) !== 'hidden')),
    ...extra,
  ];
  return (
    <section id="categories" className="pt-20 lg:pt-28">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="kicker justify-center">Shop by Category</p>
          <h2 className={H2}>Find exactly what you need</h2>
        </Reveal>
        <div className="mt-10 flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 xl:justify-between">
          {tiles.map((c, i) => {
            const n = products.filter((p) => p.dept === c.dept && (!c.cat || p.cat === c.cat)).length;
            const isTrading = tradingNames.has(c.dept);
            const soon = !isTrading && catStatus(c.dept, c.cat) === 'coming_soon';
            const src = c.src || (c.photo ? U(c.photo, 320, 320) : productImg({ img: c.img }));
            const fit = c.src || c.photo || c.cover ? 'object-cover' : 'object-contain p-4';
            const sub = isTrading ? `${commodities.length} commodities` : soon ? 'Coming soon' : `${n} product${n === 1 ? '' : 's'}`;
            const body = (
              <>
                <span className="relative block w-[104px] h-[104px] sm:w-[116px] sm:h-[116px] rounded-full overflow-hidden bg-white border border-navy/10 group-hover:border-gold transition shadow-[0_14px_30px_-20px_rgba(11,35,71,.45)]">
                  <img src={src} alt="" className={`w-full h-full ${fit}`} loading="lazy" />
                  <span className="absolute inset-0 rounded-full ring-0 ring-gold group-hover:ring-2 transition" />
                </span>
                <span className="block mt-3 font-bold text-navy text-[13.5px] leading-tight group-hover:text-emerald transition">{c.label}</span>
                <span className={`block mt-0.5 text-[11.5px] ${soon || isTrading ? 'text-gold font-bold' : 'text-charcoal/50'}`}>{sub}</span>
              </>
            );
            const cls = 'cat-tile group shrink-0 w-[104px] sm:w-[116px] text-center';
            const style = { transitionDelay: `${i * 0.05}s` };
            if (isTrading) return <a key={c.dept + c.label} href="/#trading" className={cls} style={style}>{body}</a>;
            if (c.dept === 'Cosmetics') return <CosLink key={c.dept + c.label} cat={c.cat} className={cls} style={style}>{body}</CosLink>;
            return <FilterLink key={c.dept + c.label} dept={c.dept} cat={c.cat} className={cls} style={style}>{body}</FilterLink>;
          })}
        </div>
      </div>
    </section>
  );
}

/* ===================== FEATURED PRODUCTS / SHOP ===================== */
export function Shop() {
  const filter = useUI((s) => s.filter);
  const setFilter = useUI((s) => s.setFilter);
  const openEnquiry = useUI((s) => s.openEnquiry);
  const { products, featured, catStatus, departments, commodities } = useCatalogue();
  const showPricing = useStore((s) => s.settings.showPricing !== false);
  const q = filter.q.trim().toLowerCase();
  const list = !filter.dept && !filter.cat && !q
    ? featured
    : products.filter((p) => (!filter.dept || p.dept === filter.dept) && (!filter.cat || p.cat === filter.cat) && (!q || `${p.name} ${p.cat} ${p.dept} ${p.size}`.toLowerCase().includes(q)));
  const trading = !!filter.dept && departments.some((x) => x.name === filter.dept && x.kind === 'trading') && !filter.q;
  const soon = !filter.q && ((filter.cat && catStatus(filter.dept, filter.cat) === 'coming_soon') || (!filter.cat && departments.find((x) => x.name === filter.dept)?.status === 'coming_soon'));
  const title = filter.q ? 'Search results' : filter.cat ? filter.cat : trading ? 'Commodity Trading' : filter.dept ? `${filter.dept} products` : 'Handpicked for your business';
  const chips = [];
  if (filter.q) chips.push(`Search: “${filter.q}”`);
  if (filter.dept && filter.cat) chips.push(`${filter.dept} › ${filter.cat}`);
  else if (filter.dept) chips.push(filter.dept);

  return (
    <section id="shop" className="pt-20 lg:pt-28">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <p className="kicker">Featured Products</p>
            <h2 className={H2}>{title}</h2>
            <p className="mt-2 text-[13.5px] text-charcoal/55 flex items-center gap-2"><Info className="w-4 h-4 text-gold" />{showPricing ? 'Order priced items online and pay cash on delivery. Others are quoted on request.' : 'Send us your list — our team replies with wholesale pricing and an invoice.'}</p>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0" role="tablist" aria-label="Filter products">
            {[['', 'All Products'], ...departments.map((x) => [x.name, x.name])].map(([d, l]) => (
              <button key={l} className="tab" role="tab" aria-selected={filter.dept === d && !filter.q} onClick={() => setFilter({ dept: d }, false)}>{l}</button>
            ))}
          </div>
        </Reveal>
        {(filter.cat || filter.q) && (
          <div className="mt-6 flex flex-wrap items-center gap-3 text-[13px]">
            <span className="text-charcoal/60 font-semibold">{list.length} result{list.length === 1 ? '' : 's'} for</span>
            {chips.map((c) => <span key={c} className="rounded-full bg-gold-pale text-navy font-bold px-3.5 py-1.5">{c}</span>)}
            <button type="button" className="font-bold text-emerald hover:underline" onClick={() => setFilter({}, false)}>Clear filters ×</button>
          </div>
        )}
        {list.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-9 lg:gap-x-6 lg:gap-y-12" aria-live="polite">
            {list.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl bg-ivory p-10 sm:p-14 text-center">
            <span className="mx-auto w-16 h-16 rounded-full bg-white grid place-items-center text-gold"><PackageSearch className="w-7 h-7" /></span>
            <p className="font-display text-2xl sm:text-3xl text-navy mt-5">{trading ? 'Commodity trading is quoted on request' : soon ? `${filter.cat || filter.dept} — coming soon` : 'No products match your search.'}</p>
            <p className="mt-2 text-charcoal/60 max-w-[520px] mx-auto">
              {trading ? `Browse our ${commodities.length} commodities — from maize and sesame to shea nuts — and request a quote.` : soon ? 'Products for this category will be added to the store soon. You can already send a wholesale enquiry.' : 'Try another term, or browse all products.'}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {trading && <a href="#trading" className="btn btn-gold">View Commodities</a>}
              {trading && <Link href="/trading" className="btn btn-line-dark">About JOLOF TRADE CENTER</Link>}
              {soon && <button type="button" className="btn btn-gold" onClick={() => openEnquiry({ type: 'bulk', dept: filter.dept })}>Request Bulk Pricing</button>}
              <button type="button" className="btn btn-navy" onClick={() => setFilter({}, false)}>Show all products</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ===================== PROMO BANNERS ===================== */
export function PromoBanners() {
  const setFilter = useUI((s) => s.setFilter);
  return (
    <section className="pt-20 lg:pt-28" aria-label="Collections">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-5">
        <Reveal as="a" href="#shop" onClick={(e) => { e.preventDefault(); setFilter({ dept: 'Food' }); }} className="banner group relative rounded-3xl overflow-hidden min-h-[360px] lg:min-h-[420px] flex bg-emerald-950">
          <img src="https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&w=1200&q=80" alt="Bowls of spices on display at a market" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-950/70 to-emerald-950/0" />
          <div className="relative self-center p-8 sm:p-12 max-w-[440px] text-white">
            <p className="kicker !text-gold-soft">Food Collection</p>
            <h3 className="h-display text-[2rem] sm:text-[2.6rem] mt-4">Discover Our Food Collection</h3>
            <p className="mt-4 text-white/80">From authentic spices to essential grains and quality food categories.</p>
            <span className="btn btn-gold mt-8">Shop Food <ArrowRight className="mv" /></span>
          </div>
        </Reveal>
        <Reveal as="a" href="#cosmetics" className="banner group relative rounded-3xl overflow-hidden min-h-[360px] lg:min-h-[420px] flex bg-gold-pale" style={{ transitionDelay: '.1s' }}>
          <img src="https://images.unsplash.com/photo-1748543668646-e81cda0890f3?auto=format&fit=crop&w=1200&q=80" alt="Cosmetic serums and creams on clear round plates" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#F6EDD3] via-[#F6EDD3]/85 to-[#F6EDD3]/0" />
          <div className="relative self-center p-8 sm:p-12 max-w-[440px] text-navy">
            <p className="kicker !text-emerald">Cosmetics Collection</p>
            <h3 className="h-display text-[2rem] sm:text-[2.6rem] mt-4">Beauty &amp; Personal Care Essentials</h3>
            <p className="mt-4 text-charcoal/75">Explore products for skin, hair, and everyday personal care.</p>
            <span className="btn btn-navy mt-8">Shop Cosmetics <ArrowRight className="mv" /></span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ===================== COSMETICS WHOLESALE ===================== */
export function Cosmetics() {
  const cosCat = useUI((s) => s.cosCat);
  const setCosCat = useUI((s) => s.setCosCat);
  const openEnquiry = useUI((s) => s.openEnquiry);
  const { cosmetics, catStatus } = useCatalogue();
  const showPricing = useStore((s) => s.settings.showPricing !== false);
  const tabs = [['', 'All'], ['Skin Care', 'Skin Care'], ['Hair Care', 'Hair Care'], ['Cosmetics', 'Cosmetics']].filter(([c]) => !c || catStatus('Cosmetics', c) !== 'hidden');
  return (
    <section id="cosmetics" className="pt-20 lg:pt-28">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <p className="kicker">Cosmetics Wholesale</p>
            <h2 className={H2}>Beauty &amp; personal care, by the case</h2>
            <p className="mt-2 text-[13.5px] text-charcoal/55 flex items-center gap-2"><Info className="w-4 h-4 text-gold shrink-0" />{showPricing ? 'Carotone and Bio Claire are listed at JOLOF wholesale case prices. Other catalogue items are priced on request.' : 'All cosmetics are priced on request — enquire for wholesale case pricing.'}</p>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0" role="tablist" aria-label="Filter cosmetics">
            {tabs.map(([c, l]) => <button key={l} className="tab" role="tab" aria-selected={cosCat === c} onClick={() => setCosCat(c)}>{l}</button>)}
          </div>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-9 lg:gap-x-6 lg:gap-y-12" aria-live="polite">
          {cosmetics.filter((p) => !cosCat || p.cat === cosCat).map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
        <div className="mt-10 rounded-3xl bg-ivory p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <p className="font-display text-2xl text-navy">Looking for another product from the catalogue?</p>
            <p className="text-charcoal/60 text-[14.5px] mt-1">The full cosmetics range includes many more skin care, hair care, soap and fragrance lines.</p>
          </div>
          <button type="button" className="btn btn-navy shrink-0" onClick={() => openEnquiry({ type: 'bulk', dept: 'Cosmetics' })}>Enquire Now <ArrowRight className="mv" /></button>
        </div>
      </div>
    </section>
  );
}

/* ===================== Carousel tracks ===================== */
function Track({ id, kicker, title, note, items }) {
  const ref = useRef(null);
  const [can, setCan] = useState({ prev: false, next: true });
  const update = useCallback(() => {
    const t = ref.current;
    if (!t) return;
    setCan({ prev: t.scrollLeft >= 5, next: t.scrollLeft + t.clientWidth < t.scrollWidth - 5 });
  }, []);
  useEffect(() => {
    update();
    const t = ref.current;
    const on = () => requestAnimationFrame(update);
    t?.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', update);
    return () => { t?.removeEventListener('scroll', on); window.removeEventListener('resize', update); };
  }, [update, items.length]);
  const by = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85 });
  return (
    <section id={id} className="pt-20 lg:pt-28">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="flex items-end justify-between gap-6">
          <div>
            <p className="kicker">{kicker}</p>
            <h2 className={H2}>{title}</h2>
            {note && <p className="mt-2 text-[13px] text-charcoal/55">{note}</p>}
          </div>
          <div className="hidden sm:flex gap-2">
            <button className="car-btn" aria-label="Previous products" disabled={!can.prev} onClick={() => by(-1)}><ChevronLeft className="w-5 h-5" /></button>
            <button className="car-btn" aria-label="Next products" disabled={!can.next} onClick={() => by(1)}><ChevronRight className="w-5 h-5" /></button>
          </div>
        </Reveal>
        <div ref={ref} className="track no-scrollbar mt-8 flex gap-4 lg:gap-6 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 [&>*]:w-[68%] sm:[&>*]:w-[44%] md:[&>*]:w-[31%] lg:[&>*]:w-[calc(25%-18px)] [&>*]:shrink-0">
          {items.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </div>
    </section>
  );
}
export function BestSellers() {
  const { best } = useCatalogue();
  return <Track id="best-sellers" kicker="Best Sellers" title="Popular picks" note="Demo merchandising collection — rankings will reflect real sales data once the store is live." items={best} />;
}
export function NewArrivals() {
  const { fresh } = useCatalogue();
  return <Track id="new-arrivals" kicker="New Arrivals" title="Just landed" items={fresh} />;
}

/* ===================== WHOLESALE ===================== */
export function Wholesale() {
  const openEnquiry = useUI((s) => s.openEnquiry);
  return (
    <section id="wholesale" className="pt-20 lg:pt-28">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-[2rem] overflow-hidden bg-navy text-white grid lg:grid-cols-2">
          <div className="absolute inset-0 opacity-[.07] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#E3B744 1px,transparent 1.2px)', backgroundSize: '22px 22px' }} aria-hidden="true" />
          <Reveal className="relative p-8 sm:p-12 lg:p-16">
            <p className="kicker !text-gold-soft">Wholesale</p>
            <h2 className="h-display text-[2.1rem] sm:text-[2.9rem] mt-4">Wholesale Solutions for Your Business</h2>
            <p className="mt-5 text-white/75 text-[1.02rem] leading-relaxed max-w-[520px]">Explore product sourcing and bulk purchasing opportunities across our food, cosmetics, and trading departments.</p>
            <ol className="mt-9 space-y-5">
              {[['1', 'Build your list', 'Add products from any department to your cart.'], ['2', 'Request bulk pricing', 'Share quantities and requirements with our team.'], ['3', 'Receive a tailored quote', 'We review your enquiry and respond with options.']].map(([n, t, s]) => (
                <li key={n} className="flex gap-4"><span className="w-10 h-10 shrink-0 rounded-full border border-gold/60 text-gold-soft grid place-items-center font-display">{n}</span><div><p className="font-bold">{t}</p><p className="text-white/65 text-sm mt-0.5">{s}</p></div></li>
              ))}
            </ol>
            <div className="mt-10 flex flex-wrap gap-3">
              <a href="#trading" className="btn btn-gold">Explore Wholesale <ArrowRight className="mv" /></a>
              <button type="button" className="btn btn-line" onClick={() => openEnquiry({ type: 'bulk' })}>Request Bulk Pricing</button>
            </div>
          </Reveal>
          <div className="relative min-h-[320px] lg:min-h-full">
            <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80" alt="Distribution warehouse with stocked shelving" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-navy via-navy/30 to-transparent" />
            <div className="absolute right-5 bottom-5 sm:right-8 sm:bottom-8 bg-white text-navy rounded-2xl p-5 max-w-[260px] shadow-2xl">
              <p className="text-[10px] font-extrabold tracking-[.22em] uppercase text-gold">Departments</p>
              <ul className="mt-3 space-y-2 text-[14px] font-bold">
                <li className="flex items-center gap-2"><Wheat className="w-4 h-4 text-emerald" />Food Wholesale</li>
                <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald" />Cosmetics Wholesale</li>
                <li className="flex items-center gap-2"><Ship className="w-4 h-4 text-emerald" />Commodity Trading</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ===================== TRADING ===================== */
export function Trading({ intro = true }) {
  const openEnquiry = useUI((s) => s.openEnquiry);
  const { commodities, tradingDepts } = useCatalogue();
  const quote = (c) => openEnquiry({ type: 'commodity', dept: tradingDepts[0]?.name || 'Trading', commodityId: c?.id || '' });
  return (
    <section id="trading" className="pt-20 lg:pt-28">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          {intro ? <div>
            <p className="kicker">JOLOF TRADE CENTER</p>
            <h2 className={H2}>Global Commodity Trading <span className="text-gold">|</span> From Africa to the World</h2>
            <p className="mt-3 text-[14.5px] text-charcoal/65 max-w-[720px] leading-relaxed">JOLOF TRADE CENTER is an international commodity trading company with strategically located offices in Dakar, Senegal, and New York, United States — connecting Africa&apos;s exceptional resources with international markets. Every commodity is quoted on request: tell us the quantity and destination you need.</p>
          </div> : <div>
            <p className="kicker">Commodity Trading</p>
            <h2 className={H2}>Commodities we trade</h2>
            <p className="mt-2 text-[14.5px] text-charcoal/60 max-w-[640px]">Every commodity is quoted on request — tell us the quantity and destination you need.</p>
          </div>}
          <div className="flex flex-wrap gap-3 self-start lg:self-auto">
            {intro && <Link href="/trading" className="btn btn-line-dark">About JOLOF TRADE CENTER</Link>}
            <button type="button" className="btn btn-gold" onClick={() => quote(null)}>Request a Quote <ArrowRight className="mv" /></button>
          </div>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-5">
          {commodities.map((c, i) => (
            <article key={c.id} className="group rounded-2xl border border-navy/10 bg-white overflow-hidden flex flex-col hover:border-gold/70 hover:shadow-[0_24px_50px_-30px_rgba(11,35,71,.45)] transition">
              <div className="cat-tile relative aspect-[4/3] overflow-hidden bg-ivory">
                <img src={c.img} alt={c.alt || c.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                <span className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/95 text-navy font-display text-[13px] grid place-items-center shadow">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="p-4 sm:p-5 flex flex-col flex-1">
                <h3 className="font-bold text-navy text-[15px] sm:text-[16px] leading-snug">{c.name}</h3>
                <p className="text-[12.5px] sm:text-[13px] text-charcoal/60 mt-1.5 leading-relaxed">{c.line}</p>
                <button type="button" className="mt-auto pt-4 self-start inline-flex items-center gap-2 text-[12.5px] font-extrabold text-emerald hover:text-navy transition" onClick={() => quote(c)}>
                  Request a Quote <span className="transition group-hover:translate-x-1"><ArrowRight className="w-4 h-4" /></span>
                </button>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-5 text-[11.5px] text-charcoal/45">Shea nut photo: Abdul-Rauf Moshie, <a className="underline hover:text-emerald" href="https://commons.wikimedia.org/wiki/File:Shea_nuts_cuptured_in_upper_west_Region_of_Ghana.jpg" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>, CC BY-SA 4.0.</p>
      </div>
    </section>
  );
}

/* ===================== RECOMMENDED ===================== */
export function Recommended() {
  const { reco } = useCatalogue();
  return (
    <section id="recommended" className="pt-20 lg:pt-28">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-8">
          <Reveal className="lg:col-span-4">
            <div className="rounded-3xl bg-ivory p-8 lg:p-10 h-full flex flex-col">
              <p className="kicker">Recommended</p>
              <h2 className="h-display text-navy text-[2rem] sm:text-[2.5rem] mt-3">Recommended for you</h2>
              <p className="mt-4 text-charcoal/65 leading-relaxed">A mix across our departments — a quick way to explore the range.</p>
              <div className="mt-auto pt-8 hidden lg:block">
                <div className="rounded-2xl overflow-hidden aspect-[4/3]"><img src="https://images.unsplash.com/photo-1783042909392-0b8d8683e0a2?auto=format&fit=crop&w=700&q=78" alt="Millet plants with seed heads in sunlight" className="w-full h-full object-cover" loading="lazy" /></div>
              </div>
              <FilterLink dept="" className="btn btn-navy mt-8 self-start">Shop all products <ArrowRight className="mv" /></FilterLink>
            </div>
          </Reveal>
          <div className="lg:col-span-8 grid sm:grid-cols-2 gap-4">
            {reco.map((p) => <RecoCard key={p.id} p={p} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ===================== ABOUT ===================== */
export function About() {
  const aboutDepts = useCatalogue().departments;
  return (
    <section id="about" className="pt-20 lg:pt-28">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 items-center rounded-[2rem] border border-gold/30 p-6 sm:p-10 lg:p-14">
          <Reveal className="lg:col-span-4">
            <div className="bg-ivory rounded-3xl p-8 flex items-center justify-center">
              <span className="logo block w-full max-w-[420px]"><img src="/brand/logo.webp" alt="JOLOF Trade Center logo" className="w-full h-auto block" /></span>
            </div>
          </Reveal>
          <Reveal className="lg:col-span-8">
            <p className="kicker">About JOLOF TRADING</p>
            <h2 className="h-display text-navy text-[2rem] sm:text-[2.6rem] mt-3">From Africa to the world.</h2>
            <p className="mt-5 text-charcoal/70 leading-[1.85] text-[1.02rem]">JOLOF TRADING is a diversified trading and wholesale distribution business bringing together commodity trading, food wholesale and cosmetics distribution. Our online store makes it simple for retailers, distributors and commercial buyers to browse the range, build an order and request wholesale pricing — all in one place.</p>
            <div className="mt-8 grid sm:grid-cols-3 gap-4">
              {aboutDepts.map((d) => {
                const Icon = d.kind === 'trading' ? Ship : d.name === 'Cosmetics' ? Sparkles : Wheat;
                const inner = <><Icon className="w-6 h-6 text-emerald" /><p className="mt-3 font-bold text-navy">{d.name}</p><p className="text-[13px] text-charcoal/60 line-clamp-2">{d.tagline}</p></>;
                return d.kind === 'trading'
                  ? <Link key={d.id} href="/trading" className="rounded-2xl bg-ivory p-5 hover:bg-gold-pale transition">{inner}</Link>
                  : <FilterLink key={d.id} dept={d.name} className="rounded-2xl bg-ivory p-5 hover:bg-gold-pale transition">{inner}</FilterLink>;
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ===================== NEWSLETTER ===================== */
export function Newsletter() {
  const subscribe = useStore((s) => s.subscribe);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const onSubmit = (e) => {
    e.preventDefault();
    const el = e.currentTarget.querySelector('input');
    if (!email || !el.checkValidity()) { setMsg('Please enter a valid email address.'); el.focus(); return; }
    subscribe(email.trim().toLowerCase());
    setMsg('Thank you — you’re subscribed. We’ll email you about new arrivals and wholesale updates.');
    setEmail('');
  };
  return (
    <section id="newsletter" className="pt-20 lg:pt-28 pb-20 lg:pb-28">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-emerald text-white px-6 py-12 sm:p-14 lg:px-20 grid lg:grid-cols-2 gap-8 items-center">
          <svg className="absolute -right-24 -top-24 w-[420px] h-[420px] opacity-20 pointer-events-none" viewBox="0 0 400 400" fill="none" aria-hidden="true"><circle cx="200" cy="200" r="190" stroke="#E3B744" /><ellipse cx="200" cy="200" rx="95" ry="190" stroke="#E3B744" /><path d="M10 200h380M40 110h320M40 290h320" stroke="#E3B744" /></svg>
          <div className="relative">
            <p className="kicker !text-gold-soft">Newsletter</p>
            <h2 className="h-display text-[2rem] sm:text-[2.6rem] mt-3">Be first to see new products.</h2>
            <p className="mt-3 text-white/75">New arrivals, collections and wholesale updates from JOLOF TRADING.</p>
          </div>
          <form className="relative" noValidate onSubmit={onSubmit}>
            <div className="flex flex-col sm:flex-row gap-3 bg-white/10 sm:bg-white sm:p-1.5 sm:rounded-full">
              <label htmlFor="newsEmail" className="sr-only">Email address</label>
              <input id="newsEmail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" className="flex-1 h-14 sm:h-12 rounded-full px-6 bg-white text-charcoal placeholder:text-charcoal/45 focus:outline-none" />
              <button className="btn btn-navy !min-h-[52px] sm:!min-h-[48px]">Subscribe <Send className="mv" /></button>
            </div>
            <p className="mt-3 text-sm text-white/80 min-h-[1.25rem]" role="status" aria-live="polite">{msg}</p>
          </form>
        </div>
      </div>
    </section>
  );
}
