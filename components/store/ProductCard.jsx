'use client';
import { useStore } from '@/lib/store';
import { productImg } from '@/lib/catalogue';
import { money, priced, catLine, sizeLine } from '@/lib/format';
import { useUI } from './ui';
import { useProductActions, tagStyle } from './shared';
import { Heart, ShoppingBag, Eye, Mail } from './icons';

export function ProductCard({ p }) {
  const on = useStore((s) => s.wish.includes(p.id));
  const openQuick = useUI((s) => s.openQuick);
  const { add, wish, enquire } = useProductActions();
  return (
    <article className="pcard group">
      <div className="pimg relative aspect-square rounded-2xl overflow-hidden bg-white border border-navy/[.07]">
        <img src={productImg(p)} alt={p.name} className="w-full h-full object-contain" loading="lazy" decoding="async" />
        {p.tag && <span className={`tag ${tagStyle[p.tag] || 'bg-gold-soft text-navy'}`}>{p.tag}</span>}
        <button type="button" className={`wish ${on ? 'on' : ''}`} aria-pressed={on} aria-label={`${on ? 'Remove from' : 'Add to'} wishlist: ${p.name}`} onClick={() => wish(p.id)}>
          <Heart />
        </button>
        <div className="pactions">
          <button type="button" className="pact bg-white text-navy hover:bg-ivory" onClick={() => openQuick(p.id)}><Eye />Quick View</button>
          {priced(p) ? (
            <button type="button" className="pact bg-navy text-white hover:bg-emerald" onClick={() => add(p.id)}><ShoppingBag />Add to Cart</button>
          ) : (
            <button type="button" className="pact bg-gold-soft text-navy hover:bg-gold" onClick={() => enquire(p.id)}><Mail />Enquire Now</button>
          )}
        </div>
      </div>
      <div className="pt-4">
        <p className="text-[10.5px] font-extrabold tracking-[.16em] uppercase text-gold">{catLine(p)}</p>
        <h3 className="mt-1.5 font-bold text-navy text-[15px] sm:text-[16px] leading-snug">
          <button type="button" className="text-left hover:text-emerald transition" onClick={() => openQuick(p.id)}>{p.name}</button>
        </h3>
        <p className="text-[12.5px] text-charcoal/55 mt-1">{p.brand && <span className="font-semibold text-charcoal/70">{p.brand}</span>}{p.brand && sizeLine(p) ? ' · ' : ''}{sizeLine(p)}</p>
        {priced(p) ? (
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="leading-tight">
              <span className="text-[17px] font-extrabold text-navy">{money(p.price)}</span>
              {p.real && <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald/80">Wholesale price / case</span>}
            </p>
            <button type="button" className="add-mini" aria-label={`Add ${p.name} to cart`} onClick={() => add(p.id)}><ShoppingBag /></button>
          </div>
        ) : (
          <div className="mt-3 flex flex-col items-stretch md:flex-row md:items-center justify-between gap-2.5">
            <p className="leading-tight">
              <span className="text-[14px] font-extrabold text-emerald whitespace-nowrap">Price on request</span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-charcoal/40">Wholesale</span>
            </p>
            <button type="button" className="h-10 px-4 rounded-full bg-navy text-white text-[12px] font-bold hover:bg-gold hover:text-navy transition whitespace-nowrap w-full md:w-auto" aria-label={`Enquire about ${p.name}`} onClick={() => enquire(p.id)}>Enquire Now</button>
          </div>
        )}
      </div>
    </article>
  );
}

export function RecoCard({ p }) {
  const on = useStore((s) => s.wish.includes(p.id));
  const openQuick = useUI((s) => s.openQuick);
  const { add, wish, enquire } = useProductActions();
  return (
    <article className="pcard group flex gap-4 rounded-2xl border border-navy/10 p-3 hover:border-gold/60 hover:shadow-[0_20px_40px_-25px_rgba(11,35,71,.4)] transition">
      <button type="button" className="pimg relative w-[110px] sm:w-[124px] aspect-square rounded-xl overflow-hidden bg-white border border-navy/[.07] shrink-0" aria-label={`Quick view ${p.name}`} onClick={() => openQuick(p.id)}>
        <img src={productImg(p)} alt="" className="w-full h-full object-contain" loading="lazy" />
      </button>
      <div className="flex-1 min-w-0 flex flex-col">
        <p className="text-[10px] font-extrabold tracking-[.16em] uppercase text-gold">{p.cat}</p>
        <h3 className="font-bold text-navy text-[15px] leading-snug mt-1"><button type="button" className="text-left hover:text-emerald" onClick={() => openQuick(p.id)}>{p.name}</button></h3>
        <p className="text-[12px] text-charcoal/55">{p.size}</p>
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className={`font-extrabold ${priced(p) ? 'text-navy' : 'text-emerald text-[13px]'}`}>{priced(p) ? money(p.price) : 'Price on request'}</span>
          <span className="flex gap-1.5">
            <button type="button" className={`wish !static !w-9 !h-9 !shadow-none border border-navy/10 ${on ? 'on' : ''}`} aria-pressed={on} aria-label={`Wishlist ${p.name}`} onClick={() => wish(p.id)}><Heart /></button>
            <button type="button" className="add-mini !w-9 !h-9" aria-label={`${priced(p) ? 'Add to cart' : 'Enquire about'} ${p.name}`} onClick={() => (priced(p) ? add(p.id) : enquire(p.id))}>{priced(p) ? <ShoppingBag /> : <Mail />}</button>
          </span>
        </div>
      </div>
    </article>
  );
}
