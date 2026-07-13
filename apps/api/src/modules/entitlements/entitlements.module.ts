import { Module } from '@nestjs/common';
import { RATE_LIMITER_PORT } from './application/ports/rate-limiter.port';
import { EntitlementsService } from './application/entitlements.service';
import { RedisRateLimiterAdapter } from './infrastructure/redis-rate-limiter.adapter';

@Module({
  providers: [
    EntitlementsService,
    { provide: RATE_LIMITER_PORT, useClass: RedisRateLimiterAdapter },
  ],
  exports: [EntitlementsService],
})
export class EntitlementsModule {}
