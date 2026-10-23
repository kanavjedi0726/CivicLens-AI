import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* Disable turbopack's tailwind loader — we use vanilla CSS */
  turbopack: {},
};

export default nextConfig;
