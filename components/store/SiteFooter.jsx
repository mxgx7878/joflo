'use client';
import { useUI } from './ui';
import { FilterLink, SoonLink } from './shared';
import { useCounts } from './SiteHeader';
import { Home, Store, Search, Heart, ShoppingBag } from './icons';

export default function SiteFooter() {
  const openEnquiry = useUI((s) => s.openEnquiry);
  return (
    <footer className="bg-navy-950 text-white/70">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 pt-16 lg:pt-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <a href="#top" className="inline-block bg-ivory rounded-2xl p-4 border-b-2 border-gold" aria-label="JOLOF TRADING home">
              <span className="logo block h-[104px]"><img src="/brand/logo.webp" alt="JOLOF logo" className="h-full w-auto block" /></span>
            </a>
            <p className="mt-6 text-[14.5px] leading-[1.85] max-w-[360px]">JOLOF TRADING brings together international commodity trading, food wholesale, and cosmetics distribution with a commitment to lasting commercial relationships.</p>
          </div>
          <nav className="lg:col-span-2" aria-label="Shop">
            <h3 className="text-white font-display text-lg">Shop</h3><div className="w-8 h-0.5 bg-gold mt-3 mb-5" />
            <ul className="space-y-3 text-[14.5px]">
              <li><FilterLink className="hover:text-gold-soft transition" dept="">Shop All</FilterLink></li>
              <li><a className="hover:text-gold-soft transition" href="#trading">Trading</a></li>
              <li><FilterLink className="hover:text-gold-soft transition" dept="Food">Food</FilterLink></li>
              <li><a className="hover:text-gold-soft transition" href="#cosmetics">Cosmetics</a></li>
              <li><a className="hover:text-gold-soft transition" href="#new-arrivals">New Arrivals</a></li>
            </ul>
          </nav>
          <nav className="lg:col-span-3" aria-label="Customer support">
            <h3 className="text-white font-display text-lg">Customer Support</h3><div className="w-8 h-0.5 bg-gold mt-3 mb-5" />
            <ul className="space-y-3 text-[14.5px]">
              <li><button type="button" className="hover:text-gold-soft transition" onClick={() => openEnquiry({ type: 'contact' })}>Contact Us</button></li>
              <li><SoonLink className="hover:text-gold-soft transition">Shipping Information</SoonLink></li>
              <li><SoonLink className="hover:text-gold-soft transition">Returns &amp; Refunds</SoonLink></li>
              <li><button type="button" className="hover:text-gold-soft transition" onClick={() => openEnquiry({ type: 'bulk' })}>Wholesale Enquiries</button></li>
            </ul>
          </nav>
          <nav className="lg:col-span-3" aria-label="Company">
            <h3 className="text-white font-display text-lg">Company</h3><div className="w-8 h-0.5 bg-gold mt-3 mb-5" />
            <ul className="space-y-3 text-[14.5px]">
              <li><a className="hover:text-gold-soft transition" href="#about">About JOLOF TRADING</a></li>
              <li><SoonLink className="hover:text-gold-soft transition">Privacy Policy</SoonLink></li>
              <li><SoonLink className="hover:text-gold-soft transition">Terms &amp; Conditions</SoonLink></li>
            </ul>
          </nav>
        </div>
        <div className="mt-14 border-t border-gold/25 py-7 flex flex-col md:flex-row items-center justify-between gap-3 text-[13px]">
          <p>© 2026 JOLOF TRADING. All Rights Reserved.</p>
          <p className="text-white/45 text-center">Developed by <a href="http://orientpearldigital.com/" className="hover:text-gold-soft transition" target="_blank" rel="noopener noreferrer">Orient Pearl Digital</a></p>
        </div>
      </div>
    </footer>
  );
}

export function BottomNav() {
  const { cartCount, wishCount } = useCounts();
  const openPanel = useUI((s) => s.openPanel);
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-navy/10 grid grid-cols-5 h-[68px] text-[10.5px] font-bold text-navy" aria-label="Quick actions">
      <a href="#top" className="flex flex-col items-center justify-center gap-1"><Home className="w-5 h-5" />Home</a>
      <FilterLink dept="" className="flex flex-col items-center justify-center gap-1"><Store className="w-5 h-5" />Shop</FilterLink>
      <button type="button" className="flex flex-col items-center justify-center gap-1" onClick={() => {
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
        setTimeout(() => document.getElementById('mSearchInput')?.focus(), 350);
      }}><Search className="w-5 h-5" />Search</button>
      <button type="button" className="relative flex flex-col items-center justify-center gap-1" onClick={() => openPanel('wish')}>
        <span className="relative"><Heart className="w-5 h-5" /><span className={`badge ${wishCount ? '' : 'empty'} !-top-2 !-right-3`} data-wish-count>{wishCount}</span></span>Wishlist
      </button>
      <button type="button" className="relative flex flex-col items-center justify-center gap-1" onClick={() => openPanel('cart')}>
        <span className="relative"><ShoppingBag className="w-5 h-5" /><span className={`badge ${cartCount ? '' : 'empty'} !-top-2 !-right-3`} data-cart-count>{cartCount}</span></span>Cart
      </button>
    </nav>
  );
}
