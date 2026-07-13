import { Injectable, Logger } from '@nestjs/common';
import {
  canonicalizeUrl,
  extractDomain,
  type RetrievedDocument,
} from '@nexiora/search-core';
import type { SearchFilters } from '@nexiora/shared';
import type { RetrievalAdapter } from '../../application/ports/retrieval-adapter.port';

interface HnHit {
  objectID: string;
  title?: string;
  url?: string;
  story_text?: string;
  comment_text?: string;
  author?: string;
  created_at?: string;
  points?: number;
}

/**
 * Hacker News via Algolia (free, real-time tech discussion signals).
 */
@Injectable()
export class HackerNewsRetrievalAdapter implements RetrievalAdapter {
  readonly name = 'hackernews';
  private readonly logger = new Logger(HackerNewsRetrievalAdapter.name);

  async retrieve(query: string, _filters: SearchFilters): Promise<RetrievedDocument[]> {
    try {
      const url = new URL('https://hn.algolia.com/api/v1/search');
      url.searchParams.set('query', query);
      url.searchParams.set('tags', 'story');
      url.searchParams.set('hitsPerPage', '5');

      const response = await fetch(url, {
        signal: AbortSignal.timeout(8_000),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        this.logger.warn(`HN Algolia HTTP ${response.status}`);
        return [];
      }

      const payload = (await response.json()) as { hits?: HnHit[] };
      const hits = (payload.hits ?? []).filter((h) => h.title && (h.url || h.objectID));

      return hits.map((hit, index) => {
        const urlValue = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
        const snippet = (hit.story_text || hit.comment_text || hit.title || '').slice(0, 400);
        const points = hit.points ?? 0;

        return {
          id: `hn-${hit.objectID}`,
          title: hit.title || 'Hacker News story',
          url: urlValue,
          canonicalUrl: canonicalizeUrl(urlValue),
          snippet,
          domain: extractDomain(urlValue),
          sourceType: 'hn' as const,
          isOfficial: false,
          trustScore: Math.min(80, 45 + Math.log10(points + 1) * 15),
          relevanceScore: Math.max(0.25, 0.85 - index * 0.08),
          publishedAt: hit.created_at ? new Date(hit.created_at) : undefined,
          retrievedAt: new Date(),
          author: hit.author,
          language: 'en',
        };
      });
    } catch (error) {
      this.logger.warn(`HN retrieval failed: ${(error as Error).message}`);
      return [];
    }
  }
}
