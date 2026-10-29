'use client';
// JOLOF TRADE CENTER — the Trading department's welcome page (/trading). Copy supplied by the client.
import * as L from 'lucide-react';
import { useUI } from './ui';
import { Reveal, useCatalogue } from './shared';
import { Trading } from './Sections';

const SECTORS = [
  ['Agricultural Commodities', L.Wheat],
  ['Seafood and Fisheries Products', L.Fish],
  ['Mineral Resources', L.Gem],
  ['Energy Commodities', L.Fuel],
  ['Industrial Raw Materials', L.Factory],
  ['International Sourcing', L.Search],
  ['Global Trade', L.Globe2],
  ['Import & Export', L.ArrowLeftRight],
  ['Logistics and Supply Chain Management', L.Ship],
];

const VALUES = [
  ['Integrity', 'We prioritize business relationships built on transparency, ethics, and trust.', L.ShieldCheck],
  ['Excellence', 'We apply international best practices to ensure quality, compliance, and performance.', L.Award],
  ['Innovation', 'We develop modern solutions to optimize international trade and supply chain management.', L.Lightbulb],
  ['Partnership', 'We build long-term relationships with producers, suppliers, investors, and customers around the world.', L.Handshake],
];

const WHY = [
  'Strategic presence in Africa and the United States',
  'Direct access to African producers',
  'An international network of business partners',
  'Expertise in international trade negotiations and contract management',
  'Strong capabilities in import-export operations and global logistics',
  'Commitment to quality, regulatory compliance, and sustainable development',
];

const H2 = 'h-display text-navy text-[2rem] sm:text-[2.6rem] mt-3';

export default function TradeCenter() {
  const openEnquiry = useUI((s) => s.openEnquiry);
  const { tradingDepts } = useCatalogue();
  const quote = () => openEnquiry({ type: 'commodity', dept: tradingDepts[0]?.name || 'Trading' });

  return (
    <>
      {/* Welcome */}
      <section className="relative overflow-hidden bg-navy text-white">
        <img src="https://images.unsplash.com/photo-1651667343153-6dc318e27e41?auto=format&fit=crop&w=1800&q=70" alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/85 to-navy-950/40" />
        <div className="relative max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <Reveal className="max-w-[820px]">
            <p className="kicker !text-gold-soft">Trading Department</p>
            <h1 className="h-display text-white text-[2.6rem] sm:text-[3.6rem] lg:text-[4.2rem] mt-4">JOLOF TRADE CENTER</h1>
            <p className="mt-3 text-[1.15rem] sm:text-[1.35rem] font-semibold text-gold-soft">Global Commodity Trading | From Africa to the World</p>
            <p className="mt-6 text-white/80 text-[1.02rem] leading-[1.85]">
              JOLOF TRADE CENTER is an international commodity trading company with strategically located offices in Dakar, Senegal, and New York, United States.
            </p>
            <p className="mt-4 text-white/80 text-[1.02rem] leading-[1.85]">
              Our ambition is to become a trusted partner in global commodity trading by connecting Africa&apos;s exceptional resources with international markets.
            </p>
            <p className="mt-4 text-white/80 text-[1.02rem] leading-[1.85]">
              We develop an integrated supply chain, from sourcing directly from trusted producers and suppliers to delivering commodities to industrial companies, processors, distributors, and government entities worldwide.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 h-10 text-[13px] font-bold"><L.MapPin className="w-4 h-4 text-gold-soft" />Dakar, Senegal</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 h-10 text-[13px] font-bold"><L.MapPin className="w-4 h-4 text-gold-soft" />New York, United States</span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" className="btn btn-gold" onClick={quote}>Request a Quote <L.ArrowRight className="mv" /></button>
              <a href="#commodities" className="btn btn-line">View Commodities</a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Business sectors */}
      <section className="pt-20 lg:pt-28">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <p className="kicker">What we do</p>
            <h2 className={H2}>Our Business Sectors</h2>
          </Reveal>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SECTORS.map(([name, Icon]) => (
              <Reveal key={name} className="flex items-center gap-4 rounded-2xl border border-navy/10 bg-white p-5 hover:border-gold/60 transition">
                <span className="w-12 h-12 rounded-xl bg-ivory text-emerald grid place-items-center shrink-0"><Icon className="w-5 h-5" strokeWidth={1.7} /></span>
                <span className="font-bold text-navy text-[15px]">{name}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Vision & mission */}
      <section className="pt-20 lg:pt-28">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-5">
          <Reveal className="rounded-3xl bg-navy text-white p-8 sm:p-10">
            <L.Telescope className="w-8 h-8 text-gold-soft" strokeWidth={1.6} />
            <h2 className="h-display text-[2rem] mt-5">Our Vision</h2>
            <p className="mt-4 text-white/80 text-[1.02rem] leading-[1.85]">To make Africa a major player in global commodity trading by developing transparent, sustainable, and competitive value chains.</p>
          </Reveal>
          <Reveal className="rounded-3xl bg-emerald text-white p-8 sm:p-10">
            <L.Target className="w-8 h-8 text-gold-soft" strokeWidth={1.6} />
            <h2 className="h-display text-[2rem] mt-5">Our Mission</h2>
            <p className="mt-4 text-white/85 text-[1.02rem] leading-[1.85]">To build commercial bridges between Africa and international markets by providing reliable sourcing solutions, rigorous contract execution, and personalized support to our partners.</p>
          </Reveal>
        </div>
      </section>

      {/* Core values */}
      <section className="pt-20 lg:pt-28">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <p className="kicker justify-center">What guides us</p>
            <h2 className={H2}>Our Core Values</h2>
          </Reveal>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {VALUES.map(([name, text, Icon]) => (
              <Reveal key={name} className="rounded-3xl bg-ivory p-7">
                <span className="w-12 h-12 rounded-full bg-white text-gold grid place-items-center shadow-sm"><Icon className="w-5 h-5" strokeWidth={1.7} /></span>
                <h3 className="font-display text-[1.45rem] text-navy mt-5">{name}</h3>
                <p className="mt-2 text-[14px] text-charcoal/70 leading-relaxed">{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="pt-20 lg:pt-28">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 items-start rounded-[2rem] border border-gold/30 p-6 sm:p-10 lg:p-14">
            <Reveal className="lg:col-span-5">
              <p className="kicker">Why choose us</p>
              <h2 className={H2}>Why JOLOF TRADE CENTER?</h2>
            </Reveal>
            <Reveal className="lg:col-span-7">
              <ul className="space-y-3.5">
                {WHY.map((w) => (
                  <li key={w} className="flex gap-3 text-[15px] text-charcoal/80 leading-relaxed">
                    <L.CircleCheck className="w-5 h-5 text-emerald shrink-0 mt-0.5" strokeWidth={1.8} />{w}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Closing statement */}
      <section className="pt-20 lg:pt-28">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="rounded-[2rem] bg-navy text-white text-center px-6 py-14 sm:px-14 sm:py-20">
            <p className="max-w-[760px] mx-auto text-[1.1rem] sm:text-[1.25rem] leading-[1.8] text-white/85">
              At JOLOF TRADE CENTER, we do more than trade commodities. We create opportunities, connect markets, and contribute to economic growth between Africa and the rest of the world.
            </p>
            <p className="h-display text-[2rem] sm:text-[2.6rem] mt-8">JOLOF TRADE CENTER</p>
            <p className="mt-2 text-gold-soft font-semibold text-[1.05rem]">Connecting Africa&apos;s Resources to Global Markets.</p>
            <p className="mt-1 text-white/70">From Africa to the World.</p>
            <button type="button" className="btn btn-gold mt-8" onClick={quote}>Request a Quote <L.ArrowRight className="mv" /></button>
          </Reveal>
        </div>
      </section>

      {/* Commodities we trade (the same list as the home page, managed in Admin → Trading) */}
      <div id="commodities" className="scroll-mt-24 pb-4">
        <Trading intro={false} />
      </div>
    </>
  );
}
