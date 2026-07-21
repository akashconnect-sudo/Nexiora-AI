import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { SearchStreamEvent } from '../../modules/search/application/search-event-bus';
import { RedisService } from '../redis/redis.service';

const STREAM_MAX_LEN = 1000;
const STREAM_TTL_SECONDS = 60 * 60;

/**
 * Cross-process search event bus backed by Redis Streams.
 * Falls back to in-process listeners when Redis is unavailable.
 */
@Injectable()
export class RedisStreamSearchEventBus implements OnModuleDestroy {
  private readonly logger = new Logger(RedisStreamSearchEventBus.name);
  private readonly local = new Map<string, Set<(event: SearchStreamEvent) => void>>();
  private readonly polls = new Map<string, NodeJS.Timeout>();

  constructor(private readonly redis: RedisService) {}

  subscribe(searchId: string, listener: (event: SearchStreamEvent) => void): () => void {
    const set = this.local.get(searchId) ?? new Set();
    set.add(listener);
    this.local.set(searchId, set);
    this.ensurePoll(searchId);

    return () => {
      set.delete(listener);
      if (set.size === 0) {
        this.local.delete(searchId);
        const timer = this.polls.get(searchId);
        if (timer) {
          clearInterval(timer);
          this.polls.delete(searchId);
        }
      }
    };
  }

  publish(searchId: string, event: SearchStreamEvent): void {
    const local = this.local.get(searchId);
    if (local) {
      for (const listener of local) listener(event);
    }
    void this.append(searchId, event);
  }

  private async append(searchId: string, event: SearchStreamEvent): Promise<void> {
    try {
      if (!(await this.redis.isHealthy())) return;
      const key = this.key(searchId);
      await this.redis.raw.xadd(
        key,
        'MAXLEN',
        '~',
        String(STREAM_MAX_LEN),
        '*',
        'type',
        event.type,
        'payload',
        JSON.stringify(event),
        'timestamp',
        new Date().toISOString(),
      );
      await this.redis.raw.expire(key, STREAM_TTL_SECONDS);
    } catch (error) {
      this.logger.warn(`Failed to publish search stream event: ${(error as Error).message}`);
    }
  }

  private ensurePoll(searchId: string): void {
    if (this.polls.has(searchId)) return;
    let lastId = '0-0';
    const timer = setInterval(() => {
      void (async () => {
        try {
          if (!(await this.redis.isHealthy())) return;
          const rows = await this.redis.raw.xread(
            'COUNT',
            50,
            'BLOCK',
            100,
            'STREAMS',
            this.key(searchId),
            lastId,
          );
          if (!rows) return;
          for (const [, messages] of rows) {
            for (const [id, fields] of messages) {
              lastId = id;
              const payloadIndex = fields.findIndex((value) => value === 'payload');
              const raw = payloadIndex >= 0 ? fields[payloadIndex + 1] : null;
              if (!raw) continue;
              const event = JSON.parse(raw) as SearchStreamEvent;
              const listeners = this.local.get(searchId);
              if (!listeners) continue;
              for (const listener of listeners) listener(event);
            }
          }
        } catch {
          // Polling is best-effort; SSE clients still fall back to GET /search/:id.
        }
      })();
    }, 400);
    this.polls.set(searchId, timer);
  }

  private key(searchId: string): string {
    return `search-events:${searchId}`;
  }

  onModuleDestroy(): void {
    for (const timer of this.polls.values()) clearInterval(timer);
    this.polls.clear();
    this.local.clear();
  }
}
