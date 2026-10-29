'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useStore, useStoreReady, useCurrentUser } from '@/lib/store';
import { productImg } from '@/lib/catalogue';
import { money, priced, catLine, sizeLine } from '@/lib/format';
import { useUI } from './ui';
import { usePathname } from 'next/navigation';
import { useCatalogue, FilterLink, CosLink, useGoShop } from './shared';
import { LocationButton } from '@/components/LocationPicker';
import { Globe2, BadgeCheck, Ship, Menu, Search, UserRound, Heart, ShoppingBag, LayoutGrid, ChevronDown, PackageCheck, ArrowRight } from './icons';

export function accountHref(user) {
  if (!user) return '/login';
  return user.role === 'admin' ? '/admin' : user.role === 'vendor' ? '/vendor' : '/account';
}
export const dashLabel = (user) => (user.role === 'admin' ? 'Admin Dashboard' : user.role === 'vendor' ? 'Supplier Dashboard' : null);

export function useCounts() {
  const ready = useStoreReady();
  const cart = useStore((s) => s.cart);
  const products = useStore((s) => s.products);
  const wish = useStore((s) => s.wish);
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = Object.entries(cart).reduce((s, [id, q]) => s + (products.find((p) => p.id === id)?.price || 0) * q, 0);
  return { cartCount: ready ? cartCount : 0, cartTotal: ready ? cartTotal : 0, wishCount: ready ? wish.length : 0 };
}

/* ---------------- Search suggestions ---------------- */
function useMatches(q, dept) {
  const { products } = useCatalogue();
  const t = q.trim().toLowerCase();
  if (!t) return [];
  return products.filter((p) => (!dept || p.dept === dept) && `${p.name} ${p.cat} ${p.dept}`.toLowerCase().includes(t));
}
function Suggestions({ list, q, active, onPick, onSeeAll }) {
  if (!list.length) return <p className="px-5 py-4 text-sm text-charcoal/60">No products found for “{q}”.</p>;
  return (
    <>
      {list.slice(0, 6).map((p, i) => (
        <button key={p.id} type="button" className="sug-item w-full flex items-center gap-4 px-4 py-3 text-left" role="option" id={`sug-${i}`} aria-selected={active === i} onClick={() => onPick(p.id)}>
          <img src={productImg(p)} alt="" className="w-12 h-12 rounded-lg object-contain bg-white border border-navy/10" />
          <span className="flex-1 min-w-0">
            <span className="block font-bold text-navy text-[14px] truncate">{p.name}</span>
            <span className="block text-[12px] text-charcoal/55">{catLine(p)} · {sizeLine(p)}</span>
          </span>
          <span className={`font-extrabold text-[13px] ${priced(p) ? 'text-navy' : 'text-emerald'}`}>{priced(p) ? money(p.price) : 'Enquire'}</span>
        </button>
      ))}
      <button type="button" className="w-full px-5 py-3.5 text-[13px] font-bold text-emerald bg-ivory text-left" onClick={onSeeAll}>
        See all {list.length} result{list.length === 1 ? '' : 's'} for “{q}” →
      </button>
    </>
  );
}

function DesktopSearch() {
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('');
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(-1);
  const wrap = useRef(null);
  const list = useMatches(q, dept);
  const { openQuick } = useUI.getState();
  const setFilter = useGoShop();
  const { departments } = useCatalogue();

  useEffect(() => {
    const onDoc = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);
  const run = () => { if (!q.trim()) return; setOpen(false); setFilter({ q, dept }); };
  const show = open && !!q.trim();

  return (
    <div className="relative flex-1 max-w-[720px] hidden lg:block" ref={wrap}>
      <form className="searchbox flex items-center h-[52px] rounded-full bg-ivory pl-2 pr-1.5" role="search" autoComplete="off" onSubmit={(e) => { e.preventDefault(); run(); }}>
        <label htmlFor="searchDept" className="sr-only">Department</label>
        <select id="searchDept" value={dept} onChange={(e) => { setDept(e.target.value); setOpen(true); setIdx(-1); }} className="h-10 bg-transparent text-[13px] font-bold text-navy pl-4 pr-2 rounded-full focus:outline-none cursor-pointer">
          <option value="">All Departments</option>{departments.map((d) => <option key={d.id}>{d.name}</option>)}
        </select>
        <span className="w-px h-6 bg-navy/15 mx-2" />
        <label htmlFor="searchInput" className="sr-only">Search products</label>
        <input
          id="searchInput" type="search" value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setIdx(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            const n = Math.min(list.length, 6);
            if (!show || !n) return;
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => (i + (e.key === 'ArrowDown' ? 1 : -1) + n) % n); }
            else if (e.key === 'Enter' && idx > -1) { e.preventDefault(); setOpen(false); openQuick(list[idx].id); }
          }}
          className="flex-1 h-full bg-transparent text-[15px] placeholder:text-charcoal/45 focus:outline-none"
          placeholder="Search Maggi, couscous, tea, Vimto, shea butter…" role="combobox" aria-autocomplete="list" aria-expanded={show} aria-controls="suggest"
          aria-activedescendant={idx > -1 ? `sug-${idx}` : undefined}
        />
        <button type="submit" className="h-10 px-5 rounded-full bg-navy text-white text-[13px] font-bold flex items-center gap-2 hover:bg-emerald transition"><Search className="w-4 h-4" />Search</button>
      </form>
      <div id="suggest" className={`absolute left-0 right-0 top-[calc(100%+8px)] bg-white rounded-2xl shadow-[0_30px_70px_-25px_rgba(11,35,71,.45)] border border-navy/5 overflow-hidden z-50 ${show ? 'open' : ''}`} role="listbox" aria-label="Product suggestions">
        {show && <Suggestions list={list} q={q} active={idx} onPick={(id) => { setOpen(false); openQuick(id); }} onSeeAll={run} />}
      </div>
    </div>
  );
}

function MobileSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const list = useMatches(q, '');
  const { openQuick } = useUI.getState();
  const setFilter = useGoShop();
  useEffect(() => {
    const onDoc = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);
  const run = () => { if (!q.trim()) return; setOpen(false); document.getElementById('mSearchInput')?.blur(); setFilter({ q, dept: '' }); };
  return (
    <form ref={wrap} className="lg:hidden pb-3 -mt-1" role="search" autoComplete="off" onSubmit={(e) => { e.preventDefault(); run(); }}>
      <label htmlFor="mSearchInput" className="sr-only">Search products</label>
      <div className="searchbox flex items-center h-12 rounded-full bg-ivory pl-4 pr-1.5">
        <Search className="w-[18px] h-[18px] text-navy/60" />
        <input id="mSearchInput" type="search" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} className="flex-1 h-full bg-transparent text-[15px] px-3 focus:outline-none placeholder:text-charcoal/45" placeholder="Search products…" />
        <button type="submit" className="h-9 px-4 rounded-full bg-navy text-white text-[12px] font-bold">Go</button>
      </div>
      {open && q.trim() && (
        <div className="mt-2 bg-white rounded-2xl shadow-xl border border-navy/5 overflow-hidden">
          <Suggestions list={list} q={q} active={-1} onPick={(id) => { setOpen(false); openQuick(id); }} onSeeAll={run} />
        </div>
      )}
    </form>
  );
}

/* ---------------- Mega menu ---------------- */
function MegaMenu() {
  const megaOpen = useUI((s) => s.megaOpen);
  const setMega = useUI((s) => s.setMega);
  const { categories, count, commodities, departments } = useCatalogue();
  const group = (g) => commodities.filter((c) => c.group === g).length;
  const cats = (dept) => categories.filter((c) => c.dept === dept && c.status !== 'hidden');
  return (
    <div
      id="mega"
      className={`absolute left-0 right-0 top-full bg-white border-t-2 border-gold shadow-[0_40px_80px_-40px_rgba(11,35,71,.55)] ${megaOpen ? 'open' : ''}`}
      role="region" aria-label="All categories"
      onMouseEnter={() => { clearTimeout(window.__megaT); setMega(true); }}
      onMouseLeave={() => { clearTimeout(window.__megaT); window.__megaT = setTimeout(() => setMega(false), 180); }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget) && e.relatedTarget?.id !== 'megaBtn') setMega(false); }}
    >
      <div className="max-w-site mx-auto px-8 py-10 grid grid-cols-12 gap-10">
        <div className="col-span-9 grid gap-10" style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(departments.length, 1), 4)}, minmax(0, 1fr))` }}>
          {departments.map((d) => (
            <div key={d.id} className="min-w-0">
              <p className="kicker">{d.name}</p>
              <h3 className="font-display text-2xl text-navy mt-3 mb-4">{d.kind === 'trading' ? 'Commodity Trading' : `${d.name} Wholesale`}</h3>
              {d.status === 'coming_soon' && <p className="text-[13px] text-gold font-bold mb-2">Coming soon</p>}
              {d.kind === 'trading' ? (
                <>
                  {cats(d.name).map((c) => (
                    <a key={c.id} className="mega-link" href="/#trading" onClick={() => setMega(false)}>{c.name} <span className="text-xs text-charcoal/40">{group(c.name)}</span></a>
                  ))}
                  <a className="mega-link !text-emerald font-bold" href="/#trading" onClick={() => setMega(false)}>View all commodities →</a>
                  <Link className="mega-link !text-emerald font-bold" href="/trading" onClick={() => setMega(false)}>About JOLOF TRADE CENTER →</Link>
                </>
              ) : (
                <>
                  {cats(d.name).map((c) => (
                    <FilterLink key={c.id} className="mega-link" dept={d.name} cat={c.name}>
                      {c.name} <span className="text-xs text-charcoal/40">{c.status === 'coming_soon' ? 'Soon' : count(d.name, c.name)}</span>
                    </FilterLink>
                  ))}
                  <FilterLink className="mega-link !text-emerald font-bold" dept={d.name}>Shop all {d.name} →</FilterLink>
                </>
              )}
            </div>
          ))}
        </div>
        <a href="/#wholesale" onClick={() => setMega(false)} className="col-span-3 relative rounded-2xl overflow-hidden min-h-[240px] group block">
          <img src="https://images.unsplash.com/photo-1602018342965-6dd19657e145?auto=format&fit=crop&w=700&q=75" alt="Golden grain field ready for harvest" className="absolute inset-0 w-full h-full object-cover transition duration-1000 group-hover:scale-105" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/30 to-transparent" />
          <div className="absolute bottom-0 p-6 text-white">
            <p className="text-[10px] font-extrabold tracking-[.25em] uppercase text-gold-soft">Wholesale</p>
            <p className="font-display text-2xl mt-2 leading-snug">Buying in bulk? Ask for wholesale pricing.</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold">Explore Wholesale <ArrowRight className="w-4 h-4" /></span>
          </div>
        </a>
      </div>
    </div>
  );
}

/* ---------------- Header ---------------- */
export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const { cartCount, cartTotal, wishCount } = useCounts();
  const ready = useStoreReady();
  const user = useCurrentUser();
  const { openPanel, openEnquiry, setMega } = useUI.getState();
  const goShop = useGoShop();
  const path = usePathname();
  const navDepts = useCatalogue().departments;
  const megaOpen = useUI((s) => s.megaOpen);
  const panel = useUI((s) => s.panel);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 10);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  const hoverOpen = () => { clearTimeout(window.__megaT); setMega(true); };
  const hoverLater = () => { clearTimeout(window.__megaT); window.__megaT = setTimeout(() => setMega(false), 180); };
  const loggedIn = ready && user;
  const firstName = loggedIn ? user.name.split(' ')[0] : '';

  return (
    <>
      {/* ===================== TOP BAR ===================== */}
      <div className="bg-navy-950 text-white/80 text-[11.5px] font-semibold tracking-[.12em] uppercase">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between gap-6">
          <div className="flex-1 overflow-hidden md:hidden">
            <div className="marquee flex w-max gap-10 whitespace-nowrap" aria-hidden="true">
              <span>✦ International Wholesale &amp; Trading</span><span>✦ Premium Quality Products</span><span>✦ Global Distribution</span>
              <span>✦ International Wholesale &amp; Trading</span><span>✦ Premium Quality Products</span><span>✦ Global Distribution</span>
            </div>
            <p className="sr-only">International Wholesale &amp; Trading · Premium Quality Products · Global Distribution</p>
          </div>
          <LocationButton dark className="md:hidden normal-case tracking-normal text-[12px] font-medium max-w-[52%] hover:text-gold-soft" />
          <ul className="hidden md:flex items-center gap-7">
            <li className="flex items-center gap-2"><Globe2 className="w-3.5 h-3.5 text-gold-soft" />International Wholesale &amp; Trading</li>
            <li className="flex items-center gap-2"><BadgeCheck className="w-3.5 h-3.5 text-gold-soft" />Premium Quality Products</li>
            <li className="flex items-center gap-2"><Ship className="w-3.5 h-3.5 text-gold-soft" />Global Distribution</li>
          </ul>
          <div className="hidden md:flex items-center gap-5 normal-case tracking-normal text-[12.5px] font-medium">
            <LocationButton dark className="max-w-[260px] hover:text-gold-soft transition" />
            <span className="w-px h-3 bg-white/25" />
            <button type="button" onClick={() => openEnquiry({ type: 'bulk' })} className="hover:text-gold-soft transition">Request Bulk Pricing</button>
            <span className="w-px h-3 bg-white/25" />
            <button type="button" onClick={() => openEnquiry({ type: 'contact' })} className="hover:text-gold-soft transition">Help &amp; Contact</button>
            <span className="w-px h-3 bg-white/25" />
            <Link href={accountHref(loggedIn ? user : null)} className="hover:text-gold-soft transition">
              {loggedIn ? (dashLabel(user) || `Hi, ${firstName}`) : 'Sign in / Register'}
            </Link>
          </div>
        </div>
      </div>

      {/* ===================== HEADER ===================== */}
      <header id="mainHeader" className={`sticky top-0 z-50 bg-white ${scrolled ? 'scrolled' : ''}`}>
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-[76px] lg:h-[92px] flex items-center gap-3 lg:gap-8">
            <button id="menuBtn" className="icon-btn lg:hidden -ml-2" aria-label="Open menu" aria-controls="menuDrawer" aria-expanded={panel === 'menu'} onClick={() => openPanel('menu')}><Menu /></button>
            <a href="/#top" className="logo h-[58px] lg:h-[72px] shrink-0" aria-label="JOLOF TRADING home">
              <img src="/brand/logo.webp" alt="JOLOF logo" className="h-full w-auto block" />
            </a>

            <DesktopSearch />

            <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
              <Link href={accountHref(loggedIn ? user : null)} className="icon-btn hidden sm:grid" aria-label={loggedIn ? `Account — ${user.name}` : 'Account'} title={loggedIn ? (dashLabel(user) || `My account (${user.name})`) : 'Sign in'}>
                <UserRound />
                {loggedIn && <span className="absolute top-[9px] right-[9px] w-2.5 h-2.5 rounded-full bg-emerald ring-2 ring-white" aria-hidden="true" />}
              </Link>
              <button className="icon-btn" aria-label="Wishlist" onClick={() => openPanel('wish')}><Heart /><span className={`badge ${wishCount ? '' : 'empty'}`} data-wish-count>{wishCount}</span></button>
              <button className="icon-btn lg:!w-auto lg:px-3 lg:gap-3 lg:flex lg:rounded-full" aria-label="Shopping cart" onClick={() => openPanel('cart')}>
                <span className="relative grid place-items-center"><ShoppingBag /><span className={`badge ${cartCount ? '' : 'empty'} !-top-2 !-right-2.5`} data-cart-count>{cartCount}</span></span>
                <span className="hidden lg:flex flex-col items-start leading-tight text-left">
                  <span className="text-[10.5px] font-bold uppercase tracking-[.14em] text-charcoal/50">Your Cart</span>
                  <span className="text-[14px] font-extrabold text-navy">{money(cartTotal)}</span>
                </span>
              </button>
            </div>
          </div>

          <MobileSearch />
        </div>

        {/* Navigation */}
        <nav className="hidden lg:block bg-navy relative" aria-label="Main">
          <div className="max-w-site mx-auto px-8 flex items-center gap-8">
            <button id="megaBtn" className="h-[52px] -ml-8 pl-8 pr-6 bg-emerald text-white text-[13px] font-bold tracking-wide flex items-center gap-3 hover:bg-emerald-500 transition" aria-expanded={megaOpen} aria-controls="mega"
              onClick={() => setMega(!megaOpen)} onMouseEnter={hoverOpen} onMouseLeave={hoverLater}>
              <LayoutGrid className="w-[18px] h-[18px]" /> All Categories <ChevronDown className="w-4 h-4" />
            </button>
            <ul className="flex items-center gap-7 xl:gap-9">
              <li><a className={`navlink ${path === '/' ? 'active' : ''}`} href="/#top">Home</a></li>
              <li>
                <a className="navlink" href="/#shop" onMouseEnter={hoverOpen} onMouseLeave={hoverLater} onFocus={hoverOpen} onClick={(e) => { e.preventDefault(); goShop({}); }}>
                  Shop All <ChevronDown className="w-3.5 h-3.5" />
                </a>
              </li>
              {navDepts.map((d) => (
                <li key={d.id}>{d.kind === 'trading'
                  ? <Link className={`navlink ${path === '/trading' ? 'active' : ''}`} href="/trading">{d.name}</Link>
                  : <FilterLink className="navlink" dept={d.name}>{d.name}</FilterLink>}</li>
              ))}
              <li><a className="navlink" href="/#new-arrivals">New Arrivals <span className="ml-1 text-[9px] font-extrabold tracking-wider bg-gold-soft text-navy rounded-full px-1.5 py-0.5">NEW</span></a></li>
              <li><a className="navlink" href="/#about">About Us</a></li>
              <li><button type="button" className="navlink" onClick={() => openEnquiry({ type: 'contact' })}>Contact</button></li>
            </ul>
            <button type="button" onClick={() => openEnquiry({ type: 'bulk' })} className="ml-auto text-[12.5px] font-bold text-gold-soft flex items-center gap-2 hover:text-white transition"><PackageCheck className="w-4 h-4" /> Wholesale Enquiries</button>
          </div>
          <MegaMenu />
        </nav>
      </header>
    </>
  );
}
