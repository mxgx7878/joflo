'use client';
// Storefront chrome: header, footer, mobile bottom bar and every overlay (menu, cart, wishlist, quick view, enquiry).
import SiteHeader from './SiteHeader';
import { LocationGate } from '@/components/LocationPicker';
import SiteFooter, { BottomNav } from './SiteFooter';
import { Scrim, MobileMenu, CartDrawer, WishDrawer, QuickView, EnquiryModal, useOverlayBehaviour } from './Overlays';

export { SiteHeader, SiteFooter };

export default function StoreChrome({ children }) {
  useOverlayBehaviour();
  return (
    <div className="pb-[68px] lg:pb-0">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:bg-gold focus:text-navy focus:px-4 focus:py-2 focus:rounded-full">Skip to content</a>
      <SiteHeader />
      <main id="main">
        <span id="top" className="block -mt-px" />
        {children}
      </main>
      <SiteFooter />
      <BottomNav />
      <Scrim />
      <MobileMenu />
      <CartDrawer />
      <WishDrawer />
      <QuickView />
      <EnquiryModal />
      <LocationGate />
    </div>
  );
}
