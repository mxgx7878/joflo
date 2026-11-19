/** @type {import('next').NextConfig} */

// Square Web Payments SDK requires a Content-Security-Policy on the page that loads it.
// It is applied to the checkout pages only, so the rest of the site is unaffected.
// Domains: https://developer.squareup.com/docs/web-payments/content-security-policy
const sandbox = process.env.SQUARE_ENVIRONMENT !== 'production';
const sqWeb = sandbox ? 'https://sandbox.web.squarecdn.com' : 'https://web.squarecdn.com';
const sqPci = sandbox ? 'https://pci-connect.squareupsandbox.com' : 'https://pci-connect.squareup.com';
const sqApi = sandbox ? 'https://*.squareupsandbox.com' : 'https://*.squareup.com';
const dev = process.env.NODE_ENV !== 'production';

const checkoutCsp = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; dev mode also needs eval for hot reload
  `script-src 'self' 'unsafe-inline' ${dev ? "'unsafe-eval' " : ''}${sqWeb}`,
  `frame-src 'self' ${sqWeb} ${sqApi}`,
  `connect-src 'self' ${sqWeb} ${sqPci} ${sqApi} https://o160250.ingest.sentry.io${dev ? ' ws:' : ''}`,
  `style-src 'self' 'unsafe-inline' ${sqWeb}`,
  `font-src 'self' data: ${sqWeb} https://square-fonts-production-f.squarecdn.com https://d1g145x70srn7h.cloudfront.net`,
  "img-src 'self' data: blob: https:",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  // NEXT_DIST lets several builds run side by side during development; defaults to .next
  distDir: process.env.NEXT_DIST || '.next',
  async headers() {
    return [{ source: '/checkout/:path*', headers: [{ key: 'Content-Security-Policy', value: checkoutCsp }] }, { source: '/checkout', headers: [{ key: 'Content-Security-Policy', value: checkoutCsp }] }];
  },
};
export default nextConfig;
