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

const nestTraceGlobs = ['./nest-dist/**/*', './nest-runtime/**/*'];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@nexiora/ui', '@nexiora/shared'],
  poweredByHeader: false,
  serverExternalPackages: [
    '@nexiora/nest-runtime',
    '@nestjs/common',
    '@nestjs/config',
    '@nestjs/core',
    '@nestjs/platform-express',
    '@nestjs/swagger',
    '@prisma/client',
    '@clerk/backend',
    '@nexiora/search-core',
    'express',
    'ioredis',
    'jose',
    'nestjs-pino',
    'nodemailer',
    'pino',
    'pino-http',
    'reflect-metadata',
    'zod',
    'dotenv',
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      const previous = config.externals;
      config.externals = [
        ...(Array.isArray(previous) ? previous : previous ? [previous] : []),
        (
          { request }: { request?: string },
          callback: (err?: Error | null, result?: string) => void,
        ) => {
          if (
            request === 'node:module' ||
            request === 'module' ||
            request === '@nexiora/nest-runtime'
          ) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    }
    return config;
  },
  async rewrites() {
    return nestProxy;
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
  outputFileTracingIncludes: {
    '/api/*': nestTraceGlobs,
    '/api/**': nestTraceGlobs,
  },
};

export default nextConfig;
