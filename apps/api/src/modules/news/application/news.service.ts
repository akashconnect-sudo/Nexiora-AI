import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { cleanDisplayText } from '@nexiora/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

export interface NewsListItem {
  id: string;
  title: string;
  url: string;
  source: string;
  category: string;
  publishedAt: string;
  summary: string | null;
}

const RSS_FEEDS: Array<{ url: string; category: string; source: string }> = [
  {
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    category: 'world',
    source: 'BBC World',
  },
  {
    url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    category: 'technology',
    source: 'BBC Technology',
  },
  {
    url: 'https://feeds.bbci.co.uk/news/business/rss.xml',
    category: 'business',
    source: 'BBC Business',
  },
  {
    url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    category: 'science',
    source: 'BBC Science',
  },
];

/**
 * Serves news from Postgres when available; otherwise refreshes from public
 * BBC RSS + Hacker News into an in-memory cache for local/dev.
 */
@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private memory: NewsListItem[] = [];
  private memoryFetchedAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  async list(input: { category?: string; limit: number }): Promise<{ items: NewsListItem[] }> {
    if (await this.prisma.isHealthy()) {
      try {
        const rows = await this.prisma.newsItem.findMany({
          where: input.category ? { category: input.category } : undefined,
          orderBy: { publishedAt: 'desc' },
          take: input.limit,
        });
        if (rows.length > 0) {
          return {
            items: rows.map((row) => ({
              id: row.id,
              title: row.title,
              url: row.url,
              source: row.source,
              category: row.category,
              publishedAt: row.publishedAt.toISOString(),
              summary: row.summary,
            })),
          };
        }
      } catch (error) {
        this.logger.warn(`News DB read failed: ${(error as Error).message}`);
      }
    }

    await this.refreshMemoryIfStale();
    const filtered = input.category
      ? this.memory.filter((item) => item.category === input.category)
      : this.memory;
    return { items: filtered.slice(0, input.limit) };
  }

  private async refreshMemoryIfStale(): Promise<void> {
    const stale = Date.now() - this.memoryFetchedAt > 3 * 60_000;
    if (!stale && this.memory.length > 0) return;

    const batches = await Promise.all([
      this.fetchHn(),
      ...RSS_FEEDS.map((feed) => this.fetchRss(feed)),
    ]);

    const merged = batches.flat();
    const seen = new Set<string>();
    const next = merged
      .filter((item) => {
        const key = (item.url || item.title).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return Boolean(item.title?.trim());
      })
      .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));

    if (next.length > 0) {
      this.memory = next.map((item) => ({
        ...item,
        title: cleanDisplayText(item.title),
        summary: item.summary ? cleanDisplayText(item.summary) : null,
      }));
      this.memoryFetchedAt = Date.now();
      this.logger.log(`News cache refreshed with ${this.memory.length} items`);
    }
  }

  private async fetchHn(): Promise<NewsListItem[]> {
    try {
      const url = new URL('https://hn.algolia.com/api/v1/search');
      url.searchParams.set('tags', 'front_page');
      url.searchParams.set('hitsPerPage', '20');

      const response = await fetch(url, {
        signal: AbortSignal.timeout(8_000),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        this.logger.warn(`HN news refresh HTTP ${response.status}`);
        return [];
      }

      const payload = (await response.json()) as {
        hits?: Array<{
          objectID: string;
          title?: string;
          url?: string;
          story_text?: string;
          created_at?: string;
        }>;
      };

      return (payload.hits ?? [])
        .filter((hit) => hit.title && !/review|coupon|discount|crypto\s*casino/i.test(hit.title))
        .map((hit) => ({
          id: `hn-${hit.objectID}`,
          title: hit.title!,
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          source: 'Hacker News',
          category: 'technology',
          publishedAt: hit.created_at || new Date().toISOString(),
          summary: hit.story_text?.slice(0, 280) ?? null,
        }));
    } catch (error) {
      this.logger.warn(`HN refresh failed: ${(error as Error).message}`);
      return [];
    }
  }

  private async fetchRss(feed: {
    url: string;
    category: string;
    source: string;
  }): Promise<NewsListItem[]> {
    try {
      const response = await fetch(feed.url, {
        signal: AbortSignal.timeout(10_000),
        headers: {
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
          'User-Agent': 'NexioraAI/0.1 (+https://nexiora.ai)',
        },
      });
      if (!response.ok) {
        this.logger.warn(`RSS ${feed.source} HTTP ${response.status}`);
        return [];
      }
      const xml = await response.text();
      return parseRssItems(xml, feed);
    } catch (error) {
      this.logger.warn(`RSS ${feed.source} failed: ${(error as Error).message}`);
      return [];
    }
  }
}

function parseRssItems(xml: string, feed: { category: string; source: string }): NewsListItem[] {
  const items: NewsListItem[] = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  for (const block of blocks.slice(0, 12)) {
    const title = decodeXml(matchTag(block, 'title'));
    const link = decodeXml(matchTag(block, 'link') || matchTag(block, 'guid'));
    const description = decodeXml(matchTag(block, 'description'));
    const pubDate = matchTag(block, 'pubDate');
    if (!title || !link) continue;
    const published = pubDate ? new Date(pubDate) : new Date();
    items.push({
      id: `rss-${feed.category}-${hash(link)}`,
      title: title.replace(/\s+/g, ' ').trim(),
      url: link.trim(),
      source: feed.source,
      category: feed.category,
      publishedAt: Number.isNaN(+published) ? new Date().toISOString() : published.toISOString(),
      summary: description
        ? description
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 280)
        : null,
    });
  }
  return items;
}

function matchTag(block: string, tag: string): string | null {
  const cdata = block.match(
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'),
  );
  if (cdata?.[1]) return cdata[1].trim();
  const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return plain?.[1]?.trim() ?? null;
}

function decodeXml(value: string | null): string | null {
  if (!value) return null;
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function hash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h.toString(36) || randomUUID().slice(0, 8);
}
