'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FilterLink } from './shared';
import { ArrowRight, ChevronLeft, ChevronRight, Layers3, PackageOpen, BadgeCheck, Globe2 } from './icons';

const DUR = 6500;

export default function Hero() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0); // restarts the dot fill animation
  const [reduce, setReduce] = useState(false);
  const startX = useRef(null);

  useEffect(() => { setReduce(matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);
  const go = useCallback((n) => { setI((n + 3) % 3); setCycle((c) => c + 1); }, []);
  useEffect(() => {
    if (reduce || paused) return;
    const t = setInterval(() => { setI((x) => (x + 1) % 3); setCycle((c) => c + 1); }, DUR);
    return () => clearInterval(t);
  }, [reduce, paused, cycle]);

  const slide = (k, base, children) => (
    <div className={`slide ${base} ${i === k ? 'active' : ''}`} role="group" aria-roledescription="slide" aria-label={`${k + 1} of 3`} aria-hidden={i !== k}>{children}</div>
  );

  return (
    <section className="pt-4 lg:pt-6" aria-label="Featured collections">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[minmax(0,1fr)_330px] xl:grid-cols-[minmax(0,1fr)_360px] gap-4 lg:gap-5">
        <div
          id="hero"
          className={`relative h-[560px] sm:h-[540px] lg:h-[600px] rounded-3xl overflow-hidden bg-navy ${paused ? 'paused' : ''}`}
          style={{ '--dur': `${DUR}ms` }}
          aria-roledescription="carousel" aria-label="Collections"
          onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
          onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => { if (startX.current === null) return; const dx = e.changedTouches[0].clientX - startX.current; if (Math.abs(dx) > 45) go(i + (dx < 0 ? 1 : -1)); startX.current = null; }}
        >
          {slide(0, 'bg-navy', <>
            <div className="media absolute inset-0 lg:left-[44%] lg:p-5 lg:pl-0">
              <div className="h-full lg:grid lg:grid-cols-5 lg:grid-rows-2 lg:gap-4">
                <div className="h-full lg:col-span-3 lg:row-span-2 overflow-hidden lg:rounded-2xl"><img src="https://images.unsplash.com/photo-1493925410384-84f842e616fb?auto=format&fit=crop&w=1100&q=80" alt="Hands holding a pile of dried cocoa beans" className="w-full h-full object-cover" fetchPriority="high" /></div>
                <div className="hidden lg:block lg:col-span-2 overflow-hidden rounded-2xl"><img src="https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=600&q=78" alt="Natural skincare bottles and jars with botanicals" className="w-full h-full object-cover" /></div>
                <div className="hidden lg:block lg:col-span-2 overflow-hidden rounded-2xl"><img src="https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=600&q=78" alt="Spoons of ground spices and peppercorns on a dark surface" className="w-full h-full object-cover" /></div>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/70 to-navy-950/10 lg:hidden" />
            <div className="relative h-full lg:w-[44%] flex flex-col justify-end lg:justify-center p-7 sm:p-10 lg:p-14 text-white">
              <p className="anim kicker !text-gold-soft">JOLOF TRADING</p>
              <h1 className="anim d1 h-display mt-5 text-[2.35rem] sm:text-5xl xl:text-[3.7rem]">Quality Products. <em className="text-gold-soft">Global Connections.</em></h1>
              <p className="anim d2 mt-5 text-white/80 text-base sm:text-lg max-w-[440px]">Discover a world of wholesale food, cosmetics, and trading essentials.</p>
              <div className="anim d3 mt-8 flex flex-wrap gap-3">
                <FilterLink className="btn btn-gold" dept="">Shop Now <ArrowRight className="mv" /></FilterLink>
                <a href="#departments" className="btn btn-line hidden sm:inline-flex">Browse Departments</a>
              </div>
            </div>
          </>)}

          {slide(1, 'bg-emerald-950', <>
            <div className="media absolute inset-0 lg:left-[40%] overflow-hidden"><img src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1400&q=80" alt="Colourful whole and ground spices with chillies and grains" className="w-full h-full object-cover" /></div>
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/70 to-emerald-950/10 lg:bg-gradient-to-r lg:from-emerald-950 lg:from-[40%] lg:via-emerald-950/60 lg:via-[52%] lg:to-transparent" />
            <div className="relative h-full lg:w-[48%] flex flex-col justify-end lg:justify-center p-7 sm:p-10 lg:p-14 text-white">
              <p className="anim kicker !text-gold-soft">Food Collection</p>
              <h2 className="anim d1 h-display mt-5 text-[2.35rem] sm:text-5xl xl:text-[3.7rem]">Authentic Flavours. <em className="text-gold-soft">Exceptional Quality.</em></h2>
              <p className="anim d2 mt-5 text-white/80 text-base sm:text-lg max-w-[440px]">Explore our range of spices, millet, meat, and seafood.</p>
              <div className="anim d3 mt-8 flex flex-wrap gap-3">
                <FilterLink className="btn btn-gold" dept="Food">Explore Food Collection <ArrowRight className="mv" /></FilterLink>
              </div>
              <ul className="anim d4 mt-8 hidden sm:flex flex-wrap gap-2 text-[12px] font-bold">
                <li><FilterLink dept="Food" cat="Spices & Seasonings" className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 transition">Seasonings</FilterLink></li>
                <li><FilterLink dept="Food" cat="Millet & Grains" className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 transition">Millet &amp; Grains</FilterLink></li>
                <li><FilterLink dept="Food" cat="Tea & Coffee" className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 transition">Tea &amp; Coffee</FilterLink></li>
              </ul>
            </div>
          </>)}

          {slide(2, 'bg-charcoal', <>
            <div className="media absolute inset-0 lg:left-[40%] overflow-hidden"><img src="https://images.unsplash.com/photo-1748543668676-ea8241cb3886?auto=format&fit=crop&w=1400&q=80" alt="Skincare oil and cream textures with green leaves" className="w-full h-full object-cover" /></div>
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/75 to-charcoal/10 lg:bg-gradient-to-r lg:from-charcoal lg:from-[40%] lg:via-charcoal/60 lg:via-[52%] lg:to-transparent" />
            <div className="relative h-full lg:w-[48%] flex flex-col justify-end lg:justify-center p-7 sm:p-10 lg:p-14 text-white">
              <p className="anim kicker !text-gold-soft">Cosmetics Collection</p>
              <h2 className="anim d1 h-display mt-5 text-[2.35rem] sm:text-5xl xl:text-[3.7rem]">Everyday Beauty, <em className="text-gold-soft">Exceptional Care.</em></h2>
              <p className="anim d2 mt-5 text-white/80 text-base sm:text-lg max-w-[440px]">Discover skincare, haircare, and personal care essentials.</p>
              <div className="anim d3 mt-8 flex flex-wrap gap-3">
                <a href="#cosmetics" className="btn btn-gold">Shop Cosmetics <ArrowRight className="mv" /></a>
              </div>
            </div>
          </>)}

          {/* Controls */}
          <div className="absolute z-10 left-7 sm:left-10 lg:left-14 bottom-6 lg:bottom-10 flex items-center gap-2" role="tablist" aria-label="Choose slide">
            {[0, 1, 2].map((k) => (
              <button key={k} className={`dot ${i === k && !reduce ? 'active' : ''}`} role="tab" aria-selected={i === k} aria-label={`Slide ${k + 1}`} onClick={() => go(k)}>
                <span key={i === k ? `a${cycle}` : 'i'} />
              </button>
            ))}
          </div>
          <div className="absolute z-10 right-5 top-5 lg:top-auto lg:right-8 lg:bottom-8 flex items-center gap-2">
            <button className="hero-arrow" aria-label="Previous slide" onClick={() => go(i - 1)}><ChevronLeft className="w-5 h-5" /></button>
            <button className="hero-arrow" aria-label="Next slide" onClick={() => go(i + 1)}><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Side promos */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2 gap-4 lg:gap-5">
          <a href="#wholesale" className="banner group relative rounded-3xl overflow-hidden min-h-[230px] block">
            <img src="https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=800&q=78" alt="Container terminal with stacked shipping containers" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/95 via-navy-950/45 to-navy-950/10" />
            <div className="relative h-full flex flex-col justify-end p-6 text-white">
              <span className="self-start text-[10px] font-extrabold tracking-[.22em] uppercase bg-gold-soft text-navy rounded-full px-3 py-1.5">Wholesale</span>
              <p className="font-display text-[1.6rem] leading-tight mt-3">Bulk orders for your business</p>
              <span className="mt-3 inline-flex items-center gap-2 text-[13px] font-bold">Request bulk pricing <ArrowRight className="w-4 h-4 transition group-hover:translate-x-1" /></span>
            </div>
          </a>
          <a href="#new-arrivals" className="banner group relative rounded-3xl overflow-hidden min-h-[230px] block bg-sand">
            <img src="https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=78" alt="Amber glass serum bottle on a wooden stand" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/25 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-6 text-white">
              <span className="self-start text-[10px] font-extrabold tracking-[.22em] uppercase bg-white text-navy rounded-full px-3 py-1.5">New Arrivals</span>
              <p className="font-display text-[1.6rem] leading-tight mt-3">Fresh additions to the range</p>
              <span className="mt-3 inline-flex items-center gap-2 text-[13px] font-bold">Shop new in <ArrowRight className="w-4 h-4 transition group-hover:translate-x-1" /></span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}

export function ServiceStrip() {
  const items = [
    [Layers3, 'Three Departments', 'Food, cosmetics & trading in one cart', 'border-b sm:border-r lg:border-b-0'],
    [PackageOpen, 'Bulk Quantities', 'Wholesale pricing on request', 'border-b lg:border-b-0 lg:border-r'],
    [BadgeCheck, 'Quality-Focused', 'Carefully selected categories', 'border-b sm:border-b-0 sm:border-r'],
    [Globe2, 'Global Outlook', 'From Africa to the world', ''],
  ];
  return (
    <section className="mt-6 lg:mt-8" aria-label="Why shop with us">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 rounded-3xl border border-navy/10 bg-ivory overflow-hidden [&>li]:border-navy/10">
          {items.map(([Icon, t, s, b]) => (
            <li key={t} className={`flex items-center gap-4 p-5 lg:p-6 ${b}`}>
              <span className="w-12 h-12 shrink-0 rounded-full bg-white grid place-items-center text-emerald shadow-sm"><Icon className="w-5 h-5" /></span>
              <div><p className="font-bold text-navy text-[14px]">{t}</p><p className="text-[12.5px] text-charcoal/60">{s}</p></div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
