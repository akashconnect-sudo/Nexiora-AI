import { Injectable } from '@nestjs/common';
import type { HealthResponse, ReadyResponse } from '@nexiora/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { OpenSearchSearchClient } from '../search/infrastructure/indexed/opensearch-search.client';
import { QdrantSearchClient } from '../search/infrastructure/indexed/qdrant-search.client';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly openSearch: OpenSearchSearchClient,
    private readonly qdrant: QdrantSearchClient,
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
    const [database, redis, opensearch, qdrant] = await Promise.all([
      this.prisma.isHealthy(),
      this.redis.isHealthy(),
      this.openSearch.isHealthy(),
      this.qdrant.isHealthy(),
    ]);

    const checks = { database, redis };
    const ready = Object.values(checks).every(Boolean);

    return {
      status: ready ? 'ready' : 'not_ready',
      checks,
      diagnostics: { opensearch, qdrant },
      timestamp: new Date().toISOString(),
    };
  }
}
