/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  // NEXT_DIST lets several builds run side by side during development; defaults to .next
  distDir: process.env.NEXT_DIST || '.next',
};
export default nextConfig;
