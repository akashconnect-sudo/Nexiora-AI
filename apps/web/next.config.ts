import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@nexiora/ui', '@nexiora/shared'],
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: '/v1/:path*', destination: '/api/v1/:path*' },
      { source: '/health', destination: '/api/health' },
      { source: '/ready', destination: '/api/ready' },
      { source: '/openapi.json', destination: '/api/openapi.json' },
    ];
  },
  // Bundle Nest + Prisma engines into the serverless API function.
  outputFileTracingIncludes: {
    '/api/**': ['./nest-dist/**/*', '../api/dist/**/*'],
  },
};

export default nextConfig;
