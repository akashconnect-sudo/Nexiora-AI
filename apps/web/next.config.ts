import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = path.dirname(fileURLToPath(import.meta.url));

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

const nestTraceGlobs = [
  './nest-dist/**/*',
  './nest-runtime/**/*',
  './nest-loader.cjs',
  '../api/dist/**/*',
  './node_modules/@nexiora/nest-runtime/**/*',
  './node_modules/@nestjs/**/*',
  './node_modules/@prisma/**/*',
  './node_modules/.prisma/**/*',
  './node_modules/@nexiora/**/*',
  './node_modules/express/**/*',
  './node_modules/ioredis/**/*',
  './node_modules/nodemailer/**/*',
  './node_modules/nestjs-pino/**/*',
  './node_modules/pino/**/*',
  './node_modules/pino-http/**/*',
  './node_modules/jose/**/*',
  './node_modules/zod/**/*',
  './node_modules/reflect-metadata/**/*',
  './node_modules/rxjs/**/*',
  './node_modules/dotenv/**/*',
  './node_modules/@clerk/backend/**/*',
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@nexiora/ui', '@nexiora/shared'],
  poweredByHeader: false,
  // Monorepo root so Nest + Prisma deps outside apps/web can be traced.
  outputFileTracingRoot: path.join(configDir, '../..'),
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
  async rewrites() {
    return nestProxy;
  },
  outputFileTracingIncludes: {
    '/api/*': nestTraceGlobs,
    '/api/**': nestTraceGlobs,
  },
};

export default nextConfig;
