import { Injectable, Logger } from '@nestjs/common';
import type { SearchMode, SourceType } from '@nexiora/shared';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type { SearchRepositoryPort } from '../../application/ports/search-repository.port';
import type {
  CreateSearchInput,
  SearchAnswer,
  SearchCitation,
  SearchPipelineStatus,
  SearchRecord,
} from '../../domain/search.types';

/**
 * Dual-write repository: Prisma when healthy, otherwise in-memory store.
 * Same port contract — enables local Phase 1 without Docker while remaining production-capable.
 */
@Injectable()
export class HybridSearchRepository implements SearchRepositoryPort {
  private readonly logger = new Logger(HybridSearchRepository.name);
  private readonly memory = new Map<string, SearchRecord>();

  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: CreateSearchInput & { id: string; normalizedQuery: string; intent: string },
  ): Promise<SearchRecord> {
    const now = new Date().toISOString();
    const record: SearchRecord = {
      id: input.id,
      userId: input.userId,
      query: input.query,
      normalizedQuery: input.normalizedQuery,
      intent: input.intent,
      mode: input.mode,
      filters: input.filters,
      status: 'pending',
      isPrivate: input.isPrivate,
      answer: null,
      citations: [],
      relatedQuestions: [],
      betterQueries: [],
      latencyMs: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };

    this.memory.set(record.id, record);

    if (await this.canUsePrisma()) {
      try {
        await this.prisma.searchSession.create({
          data: {
            id: input.id,
            userId: input.userId ?? undefined,
            query: input.query,
            normalizedQuery: input.normalizedQuery,
            intent: input.intent,
            mode: toPrismaMode(input.mode),
            filters: input.filters,
            status: 'PENDING',
            isPrivate: input.isPrivate,
            client: input.client,
            ipHash: input.ipHash ?? undefined,
            userAgent: input.userAgent ?? undefined,
          },
        });
      } catch (error) {
        this.logger.warn(`Prisma create failed; memory retained: ${(error as Error).message}`);
      }
    }

    return record;
  }

  async updateStatus(
    id: string,
    status: SearchPipelineStatus,
    errorMessage?: string | null,
  ): Promise<void> {
    const existing = this.memory.get(id);
    if (existing) {
      this.memory.set(id, {
        ...existing,
        status,
        errorMessage: errorMessage ?? existing.errorMessage,
        updatedAt: new Date().toISOString(),
      });
    }

    if (await this.canUsePrisma()) {
      try {
        await this.prisma.searchSession.update({
          where: { id },
          data: { status: toPrismaStatus(status) },
        });
      } catch (error) {
        this.logger.warn(`Prisma status update failed: ${(error as Error).message}`);
      }
    }
  }

  async complete(
    id: string,
    data: {
      status: SearchPipelineStatus;
      answer: SearchAnswer;
      citations: SearchCitation[];
      relatedQuestions: string[];
      betterQueries: string[];
      latencyMs: number;
    },
  ): Promise<SearchRecord> {
    const existing = this.memory.get(id);
    const now = new Date().toISOString();
    const completed: SearchRecord = {
      ...(existing ?? {
        id,
        userId: null,
        query: '',
        normalizedQuery: '',
        intent: 'informational',
        mode: 'universal' as const,
        filters: {},
        isPrivate: false,
        errorMessage: null,
        createdAt: now,
      }),
      status: data.status,
      answer: data.answer,
      citations: data.citations,
      relatedQuestions: data.relatedQuestions,
      betterQueries: data.betterQueries,
      latencyMs: data.latencyMs,
      updatedAt: now,
    };
    this.memory.set(id, completed);

    if (await this.canUsePrisma()) {
      try {
        await this.prisma.searchSession.update({
          where: { id },
          data: {
            status: toPrismaStatus(data.status),
            latencyMs: data.latencyMs,
            answer: {
              create: {
                summary: data.answer.summary,
                detailedMarkdown: data.answer.detailedMarkdown,
                confidence: data.answer.confidence,
                model: data.answer.model,
                language: data.answer.language,
                verificationStatus: data.answer.verificationStatus,
                finishedAt: new Date(),
                citations: {
                  create: data.citations.map((c) => ({
                    ordinal: c.ordinal,
                    title: c.title,
                    url: c.url,
                    canonicalUrl: c.canonicalUrl,
                    snippet: c.snippet,
                    domain: c.domain,
                    sourceType: toPrismaSourceType(c.sourceType),
                    isOfficial: c.isOfficial,
                    trustScore: c.trustScore,
                    confidence: c.confidence,
                    publishedAt: c.publishedAt ? new Date(c.publishedAt) : undefined,
                    author: c.author,
                    language: c.language,
                  })),
                },
              },
            },
          },
        });
      } catch (error) {
        this.logger.warn(`Prisma complete failed: ${(error as Error).message}`);
      }
    }

    return completed;
  }

  async findById(id: string): Promise<SearchRecord | null> {
    const mem = this.memory.get(id);
    if (mem) return mem;

    if (!(await this.canUsePrisma())) return null;

    try {
      const row = await this.prisma.searchSession.findUnique({
        where: { id },
        include: { answer: { include: { citations: { orderBy: { ordinal: 'asc' } } } } },
      });
      return row ? fromPrisma(row) : null;
    } catch {
      return null;
    }
  }

  async listHistory(
    userId: string,
    limit: number,
    cursor?: string,
  ): Promise<{ items: SearchRecord[]; nextCursor: string | null }> {
    const fromMemory = [...this.memory.values()]
      .filter((r) => r.userId === userId && !r.isPrivate)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (await this.canUsePrisma()) {
      try {
        const rows = await this.prisma.searchSession.findMany({
          where: {
            userId,
            deletedAt: null,
            isPrivate: false,
            ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: limit + 1,
          include: { answer: { include: { citations: true } } },
        });
        const items = rows.slice(0, limit).map(fromPrisma);
        const next = rows.length > limit ? rows[limit - 1]?.createdAt.toISOString() ?? null : null;
        return { items, nextCursor: next };
      } catch (error) {
        this.logger.warn(`Prisma history failed: ${(error as Error).message}`);
      }
    }

    const start = cursor ? fromMemory.findIndex((r) => r.createdAt < cursor) : 0;
    const slice = fromMemory.slice(start < 0 ? 0 : start, (start < 0 ? 0 : start) + limit + 1);
    const items = slice.slice(0, limit);
    return {
      items,
      nextCursor: slice.length > limit ? items[items.length - 1]?.createdAt ?? null : null,
    };
  }

  private async canUsePrisma(): Promise<boolean> {
    try {
      return await this.prisma.isHealthy();
    } catch {
      return false;
    }
  }
}

function toPrismaMode(mode: SearchMode) {
  return mode.toUpperCase() as never;
}

function toPrismaStatus(status: SearchPipelineStatus) {
  return status.toUpperCase() as never;
}

function toPrismaSourceType(sourceType: SourceType) {
  return sourceType.toUpperCase() as never;
}

function fromPrisma(row: {
  id: string;
  userId: string | null;
  query: string;
  normalizedQuery: string;
  intent: string | null;
  mode: string;
  filters: unknown;
  status: string;
  isPrivate: boolean;
  latencyMs: number | null;
  createdAt: Date;
  updatedAt: Date;
  answer: null | {
    summary: string;
    detailedMarkdown: string;
    confidence: { toNumber?: () => number } | number;
    model: string;
    language: string;
    verificationStatus: string;
    citations: Array<{
      ordinal: number;
      title: string;
      url: string;
      canonicalUrl: string;
      snippet: string;
      domain: string;
      sourceType: string;
      isOfficial: boolean;
      trustScore: { toNumber?: () => number } | number;
      confidence: { toNumber?: () => number } | number;
      publishedAt: Date | null;
      author: string | null;
      language: string | null;
    }>;
  };
}): SearchRecord {
  return {
    id: row.id,
    userId: row.userId,
    query: row.query,
    normalizedQuery: row.normalizedQuery,
    intent: row.intent ?? 'informational',
    mode: row.mode.toLowerCase() as SearchMode,
    filters: (row.filters ?? {}) as SearchRecord['filters'],
    status: row.status.toLowerCase() as SearchPipelineStatus,
    isPrivate: row.isPrivate,
    answer: row.answer
      ? {
          summary: row.answer.summary,
          detailedMarkdown: row.answer.detailedMarkdown,
          confidence: num(row.answer.confidence),
          model: row.answer.model,
          language: row.answer.language,
          verificationStatus: row.answer.verificationStatus as SearchAnswer['verificationStatus'],
        }
      : null,
    citations:
      row.answer?.citations.map((c) => ({
        ordinal: c.ordinal,
        title: c.title,
        url: c.url,
        canonicalUrl: c.canonicalUrl,
        snippet: c.snippet,
        domain: c.domain,
        sourceType: c.sourceType.toLowerCase() as SourceType,
        isOfficial: c.isOfficial,
        trustScore: num(c.trustScore),
        confidence: num(c.confidence),
        publishedAt: c.publishedAt?.toISOString(),
        author: c.author ?? undefined,
        language: c.language ?? undefined,
      })) ?? [],
    relatedQuestions: [],
    betterQueries: [],
    latencyMs: row.latencyMs,
    errorMessage: null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function num(value: { toNumber?: () => number } | number): number {
  if (typeof value === 'number') return value;
  return value.toNumber?.() ?? Number(value);
}
