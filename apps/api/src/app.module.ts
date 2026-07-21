import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './bootstrap/config.schema';
import { AppConfigModule } from './bootstrap/app-config.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { EntitlementsModule } from './modules/entitlements/entitlements.module';
import { SearchModule } from './modules/search/search.module';
import { LibraryModule } from './modules/library/library.module';
import { BillingModule } from './modules/billing/billing.module';
import { NewsModule } from './modules/news/news.module';
import { CreatorModule } from './modules/creator/creator.module';

/** Monorepo root `.env` (apps/api → ../..) plus local override. */
const envFilePaths = [
  join(__dirname, '..', '..', '..', '.env'),
  join(process.cwd(), '.env'),
  join(process.cwd(), '..', '..', '.env'),
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: envFilePaths,
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        autoLogging: true,
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-api-key"]',
            'req.body.password',
            'req.body.email',
            'req.body.otp',
            'req.body.token',
            'req.body.query',
            'req.body.prompt',
            'res.body',
          ],
          remove: true,
        },
      },
    }),
    AppConfigModule,
    PrismaModule,
    RedisModule,
    QueueModule,
    HealthModule,
    IdentityModule,
    EntitlementsModule,
    SearchModule,
    LibraryModule,
    BillingModule,
    NewsModule,
    CreatorModule,
  ],
})
export class AppModule {}
