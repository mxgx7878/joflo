import { Playfair_Display, Manrope } from 'next/font/google';
import Providers from '@/components/Providers';
import './globals.css';

const display = Playfair_Display({ subsets: ['latin'], weight: ['500', '600', '700'], style: ['normal', 'italic'], variable: '--font-display', display: 'swap' });
const sans = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-sans', display: 'swap' });

export const metadata = {
  title: 'JOLOF TRADING | Wholesale Food, Cosmetics & Trading Store',
  description: 'Shop wholesale food, cosmetics and trading essentials from JOLOF TRADING — spices, millet & grains, meat & fish, skin care, hair care, soaps and agricultural commodities.',
  icons: { icon: '/brand/icon.png', apple: '/brand/icon.png' },
};
export const viewport = { themeColor: '#0B2347' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
