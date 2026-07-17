import { Injectable, Logger } from '@nestjs/common';
import { canonicalizeUrl, extractDomain, type RetrievedDocument } from '@nexiora/search-core';
import type { SearchFilters } from '@nexiora/shared';
import { cleanDisplayText } from '@nexiora/shared';
import type { RetrievalAdapter } from '../../application/ports/retrieval-adapter.port';

interface OpenAlexWork {
  id: string;
  display_name: string;
  publication_date?: string;
  doi?: string | null;
  abstract_inverted_index?: Record<string, number[]> | null;
  primary_location?: { landing_page_url?: string | null; source?: { display_name?: string } };
  authorships?: Array<{ author?: { display_name?: string } }>;
}

/**
 * OpenAlex scholarly works adapter (no API key required for modest volume).
 */
@Injectable()
export class OpenAlexRetrievalAdapter implements RetrievalAdapter {
  readonly name = 'openalex';
  private readonly logger = new Logger(OpenAlexRetrievalAdapter.name);

  async retrieve(query: string, _filters: SearchFilters): Promise<RetrievedDocument[]> {
    try {
      const url = new URL('https://api.openalex.org/works');
      url.searchParams.set('search', query);
      url.searchParams.set('per_page', '5');
      url.searchParams.set('mailto', 'contact@nexiora.ai');

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'NexioraAI/0.1 (mailto:contact@nexiora.ai)',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        this.logger.warn(`OpenAlex HTTP ${response.status}`);
        return [];
      }

      const payload = (await response.json()) as { results?: OpenAlexWork[] };
      const works = payload.results ?? [];

      return works.map((work, index) => {
        const landing =
          work.primary_location?.landing_page_url ||
          (work.doi ? `https://doi.org/${work.doi.replace(/^https?:\/\/doi.org\//, '')}` : work.id);
        const snippet =
          reconstructAbstract(work.abstract_inverted_index) ||
          work.primary_location?.source?.display_name ||
          'Academic work from OpenAlex.';
        const author = work.authorships?.[0]?.author?.display_name;

        return {
          id: `openalex-${work.id}`,
          title: cleanDisplayText(work.display_name),
          url: landing,
          canonicalUrl: canonicalizeUrl(landing),
          snippet: cleanDisplayText(snippet).slice(0, 400),
          domain: extractDomain(landing) || 'openalex.org',
          sourceType: 'academic' as const,
          isOfficial: true,
          trustScore: 92,
          relevanceScore: Math.max(0.3, 0.92 - index * 0.07),
          publishedAt: work.publication_date ? new Date(work.publication_date) : undefined,
          retrievedAt: new Date(),
          author,
          language: 'en',
        };
      });
    } catch (error) {
      this.logger.warn(`OpenAlex retrieval failed: ${(error as Error).message}`);
      return [];
    }
  }
}

function reconstructAbstract(inverted: Record<string, number[]> | null | undefined): string | null {
  if (!inverted) return null;
  const pairs: Array<{ word: string; pos: number }> = [];
  for (const [word, positions] of Object.entries(inverted)) {
    for (const pos of positions) {
      pairs.push({ word, pos });
    }
  }
  pairs.sort((a, b) => a.pos - b.pos);
  return pairs
    .map((p) => p.word)
    .join(' ')
    .slice(0, 500);
}
