import type { NextConfig } from 'next';

const nestProxy =
  process.env.NODE_ENV === 'development'
    ? [
        { source: '/v1/:path*', destination: 'http://localhost:3001/v1/:path*' },
        { source: '/health', destination: 'http://localhost:3001/health' },
        { source: '/ready', destination: 'http://localhost:3001/ready' },
        { source: '/openapi.json', destination: 'http://localhost:3001/openapi.json' },
      ]
    : [
        { source: '/v1/:path*', destination: '/api/v1/:path*' },
        { source: '/health', destination: '/api/health' },
        { source: '/ready', destination: '/api/ready' },
        { source: '/openapi.json', destination: '/api/openapi.json' },
      ];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@nexiora/ui', '@nexiora/shared'],
  poweredByHeader: false,
  serverExternalPackages: [
    '@nestjs/common',
    '@nestjs/core',
    '@nestjs/platform-express',
    '@prisma/client',
    'express',
  ],
  async rewrites() {
    return nestProxy;
  },
  outputFileTracingIncludes: {
    '/api/**': ['./nest-dist/**/*', '../api/dist/**/*'],
  },
};

export default nextConfig;
