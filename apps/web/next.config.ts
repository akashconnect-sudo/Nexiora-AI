import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@nexiora/ui', '@nexiora/shared'],
  poweredByHeader: false,
};

export default nextConfig;
