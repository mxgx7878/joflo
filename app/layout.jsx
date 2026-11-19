import localFont from 'next/font/local';
import Providers from '@/components/Providers';
import './globals.css';

// Fonts are bundled in app/fonts (variable woff2, latin, SIL Open Font License) so the build never
// has to download them from Google Fonts — that download fails on some hosts (e.g. Hostinger).
const display = localFont({
  src: [
    { path: './fonts/playfair-display-latin-wght-normal.woff2', weight: '400 900', style: 'normal' },
    { path: './fonts/playfair-display-latin-wght-italic.woff2', weight: '400 900', style: 'italic' },
  ],
  variable: '--font-display',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
});
const sans = localFont({
  src: [{ path: './fonts/manrope-latin-wght-normal.woff2', weight: '200 800', style: 'normal' }],
  variable: '--font-sans',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

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
