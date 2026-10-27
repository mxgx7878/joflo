import StoreChrome from '@/components/store/StoreChrome';
import Hero, { ServiceStrip } from '@/components/store/Hero';
import {
  Departments, Categories, Shop, PromoBanners, Cosmetics, BestSellers, Wholesale, Trading, NewArrivals, Recommended, About, Newsletter,
} from '@/components/store/Sections';

export default function HomePage() {
  return (
    <StoreChrome>
      <Hero />
      <ServiceStrip />
      <Departments />
      <Categories />
      <Shop />
      <PromoBanners />
      <Cosmetics />
      <BestSellers />
      <Wholesale />
      <Trading />
      <NewArrivals />
      <Recommended />
      <About />
      <Newsletter />
    </StoreChrome>
  );
}
