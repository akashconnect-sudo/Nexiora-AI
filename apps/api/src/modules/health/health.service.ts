import { Injectable } from '@nestjs/common';
import type { HealthResponse, ReadyResponse } from '@nexiora/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  liveness(): HealthResponse {
    return {
      status: 'ok',
      service: 'nexiora-api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }

  async readiness(): Promise<ReadyResponse> {
    const [database, redis] = await Promise.all([this.prisma.isHealthy(), this.redis.isHealthy()]);

    const checks = { database, redis };
    const ready = Object.values(checks).every(Boolean);

    return {
      status: ready ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
