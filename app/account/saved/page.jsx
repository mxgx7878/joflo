'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { Heart, Mail, ShoppingBag, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { productImg } from '@/lib/catalogue';
import { money, sizeLine, catLine } from '@/lib/format';
import { PageHeader, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Providers';

export default function SavedItems() {
  const toast = useToast();
  const wish = useStore((s) => s.wish);
  const products = useStore((s) => s.products);
  const { addToCart, toggleWish } = useStore.getState();
  const items = useMemo(() => wish.map((id) => products.find((p) => p.id === id)).filter(Boolean), [wish, products]);

  const move = (p) => {
    if (addToCart(p.id, p.moq || 1)) { toggleWish(p.id); toast({ text: `${p.name} moved to cart`, product: p, action: { label: 'Checkout', onClick: () => { window.location.href = '/checkout'; } } }); }
  };

  return (
    <>
      <PageHeader kicker="Wishlist" title="Saved items" sub="Products you've saved from the store." actions={items.length > 0 && <Link href="/#shop" className="dash-btn dash-btn-ghost">Keep browsing</Link>} />
      {items.length ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((p) => {
            const isPriced = typeof p.price === 'number';
            return (
              <li key={p.id} className="dash-card overflow-hidden flex flex-col">
                <div className="relative bg-ivory aspect-[4/3]">
                  <img src={productImg(p)} alt={p.name} className="absolute inset-0 w-full h-full object-contain p-6" />
                  {p.tag && <span className={`tag ${p.tag === 'New' ? 'bg-emerald text-white' : 'bg-gold-soft text-navy'}`}>{p.tag}</span>}
                  <button type="button" onClick={() => { toggleWish(p.id); toast({ text: 'Removed from saved items', product: p }); }} className="wish on" aria-label={`Remove ${p.name} from saved items`}><Heart /></button>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[.16em] text-gold">{catLine(p)}</p>
                  <p className="font-bold text-navy text-[15px] leading-snug mt-1.5">{p.name}</p>
                  <p className="text-[12px] text-charcoal/50 mt-0.5">{sizeLine(p)}</p>
                  <div className="mt-auto pt-4 flex items-center justify-between gap-3">
                    {isPriced ? <span className="text-[17px] font-extrabold text-navy">{money(p.price)}</span> : <span className="text-[13px] font-extrabold text-emerald">Price on request</span>}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => toggleWish(p.id)} className="w-10 h-10 rounded-full border-[1.5px] border-[#E2DED2] grid place-items-center text-charcoal/50 hover:text-[#B4432F] hover:border-[#B4432F]/40" aria-label={`Remove ${p.name}`}><Trash2 className="w-4 h-4" /></button>
                      {isPriced ? (
                        <button type="button" onClick={() => move(p)} disabled={p.stock <= 0} className="dash-btn dash-btn-navy"><ShoppingBag />{p.stock <= 0 ? 'Out of stock' : 'Move to cart'}</button>
                      ) : (
                        <Link href={`/account/quotes/new?product=${p.id}`} className="dash-btn dash-btn-gold"><Mail />Enquire</Link>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="dash-card">
          <EmptyState icon={Heart} title="No saved items yet" body="Tap the heart on any product in the store to save it here." action={<Link href="/#shop" className="dash-btn dash-btn-navy">Browse products</Link>} />
        </div>
      )}
    </>
  );
}
