import { Inject, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@nexiora/shared';
import { DomainError } from '../../../common/errors/domain-error';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { randomUUID } from 'node:crypto';

export interface BookmarkRecord {
  readonly id: string;
  readonly userId: string;
  readonly url: string;
  readonly title: string;
  readonly searchId: string | null;
  readonly createdAt: string;
}

export const BOOKMARK_STORE = Symbol('BOOKMARK_STORE');

export interface BookmarkStorePort {
  create(input: {
    userId: string;
    url: string;
    title: string;
    searchId?: string | null;
  }): Promise<BookmarkRecord>;
  list(userId: string): Promise<BookmarkRecord[]>;
  remove(userId: string, id: string): Promise<void>;
}

@Injectable()
export class HybridBookmarkStore implements BookmarkStorePort {
  private readonly memory = new Map<string, BookmarkRecord[]>();

  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    userId: string;
    url: string;
    title: string;
    searchId?: string | null;
  }): Promise<BookmarkRecord> {
    const record: BookmarkRecord = {
      id: randomUUID(),
      userId: input.userId,
      url: input.url,
      title: input.title,
      searchId: input.searchId ?? null,
      createdAt: new Date().toISOString(),
    };

    const list = this.memory.get(input.userId) ?? [];
    list.unshift(record);
    this.memory.set(input.userId, list);

    if (await this.prisma.isHealthy()) {
      try {
        await this.prisma.bookmark.create({
          data: {
            id: record.id,
            userId: input.userId,
            url: input.url,
            title: input.title,
            searchId: input.searchId ?? undefined,
          },
        });
      } catch {
        /* memory retained */
      }
    }

    return record;
  }

  async list(userId: string): Promise<BookmarkRecord[]> {
    if (await this.prisma.isHealthy()) {
      try {
        const rows = await this.prisma.bookmark.findMany({
          where: { userId, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 100,
        });
        return rows.map((r) => ({
          id: r.id,
          userId: r.userId,
          url: r.url,
          title: r.title,
          searchId: r.searchId,
          createdAt: r.createdAt.toISOString(),
        }));
      } catch {
        /* fall through */
      }
    }
    return this.memory.get(userId) ?? [];
  }

  async remove(userId: string, id: string): Promise<void> {
    const list = (this.memory.get(userId) ?? []).filter((b) => b.id !== id);
    this.memory.set(userId, list);

    if (await this.prisma.isHealthy()) {
      try {
        await this.prisma.bookmark.updateMany({
          where: { id, userId },
          data: { deletedAt: new Date() },
        });
      } catch {
        /* ignore */
      }
    }
  }
}

@Injectable()
export class BookmarksService {
  constructor(@Inject(BOOKMARK_STORE) private readonly store: BookmarkStorePort) {}

  create(userId: string, body: { url: string; title: string; searchId?: string }) {
    if (!body.url?.trim() || !body.title?.trim()) {
      throw new DomainError(ERROR_CODES.VALIDATION_ERROR, 'url and title are required', 400);
    }
    return this.store.create({
      userId,
      url: body.url.trim(),
      title: body.title.trim(),
      searchId: body.searchId,
    });
  }

  list(userId: string) {
    return this.store.list(userId);
  }

  async remove(userId: string, id: string) {
    await this.store.remove(userId, id);
    return { deleted: true };
  }
}
