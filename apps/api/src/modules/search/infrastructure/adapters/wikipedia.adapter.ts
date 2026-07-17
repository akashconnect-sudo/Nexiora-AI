import { Injectable, Logger } from '@nestjs/common';
import { canonicalizeUrl, extractDomain, type RetrievedDocument } from '@nexiora/search-core';
import type { SearchFilters } from '@nexiora/shared';
import { cleanDisplayText } from '@nexiora/shared';
import type { RetrievalAdapter } from '../../application/ports/retrieval-adapter.port';

interface WikiSearchItem {
  title: string;
  snippet: string;
  pageid: number;
  timestamp?: string;
}

/**
 * Wikipedia OpenSearch + extract adapter (no API key required).
 */
@Injectable()
export class WikipediaRetrievalAdapter implements RetrievalAdapter {
  readonly name = 'wikipedia';
  private readonly logger = new Logger(WikipediaRetrievalAdapter.name);

  async retrieve(query: string, _filters: SearchFilters): Promise<RetrievedDocument[]> {
    try {
      const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
      searchUrl.searchParams.set('action', 'query');
      searchUrl.searchParams.set('list', 'search');
      searchUrl.searchParams.set('srsearch', query);
      searchUrl.searchParams.set('srlimit', '5');
      searchUrl.searchParams.set('format', 'json');
      searchUrl.searchParams.set('origin', '*');

      const response = await fetch(searchUrl, {
        headers: { 'User-Agent': 'NexioraAI/0.1 (Nova Search; contact@nexiora.ai)' },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) {
        this.logger.warn(`Wikipedia search HTTP ${response.status}`);
        return [];
      }

      const payload = (await response.json()) as { query?: { search?: WikiSearchItem[] } };
      const items = payload.query?.search ?? [];

      return items.map((item, index) => {
        const titlePath = encodeURIComponent(item.title.replace(/ /g, '_'));
        const url = `https://en.wikipedia.org/wiki/${titlePath}`;
        const snippet = cleanDisplayText(item.snippet);
        return {
          id: `wiki-${item.pageid}`,
          title: cleanDisplayText(item.title),
          url,
          canonicalUrl: canonicalizeUrl(url),
          snippet,
          domain: extractDomain(url),
          sourceType: 'docs' as const,
          isOfficial: true,
          trustScore: 88,
          relevanceScore: Math.max(0.35, 0.95 - index * 0.08),
          publishedAt: item.timestamp ? new Date(item.timestamp) : undefined,
          retrievedAt: new Date(),
          language: 'en',
        };
      });
    } catch (error) {
      this.logger.warn(`Wikipedia retrieval failed: ${(error as Error).message}`);
      return [];
    }
  }
}
