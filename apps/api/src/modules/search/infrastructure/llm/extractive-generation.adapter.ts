import { Injectable } from '@nestjs/common';
import type { RankedDocument } from '@nexiora/search-core';
import { cleanDisplayText } from '@nexiora/shared';
import type {
  GenerationChunk,
  GenerationInput,
  GenerationPort,
  GenerationResult,
} from '../../application/ports/generation.port';

/**
 * Citation-grounded extractive synthesizer.
 * Used when no LLM API key is configured, and as a deterministic fallback.
 * Every sentence is derived from retrieved source snippets — no free hallucination.
 */
@Injectable()
export class ExtractiveGenerationAdapter implements GenerationPort {
  async generate(
    input: GenerationInput,
    onChunk?: (chunk: GenerationChunk) => void | Promise<void>,
  ): Promise<GenerationResult> {
    const docs = input.documents.slice(0, 8);
    if (docs.length === 0) {
      const summary =
        'No matching sources were found for this question. Try rephrasing or broadening your search.';
      await onChunk?.({ field: 'summary', text: summary });
      return {
        summary,
        detailedMarkdown: summary,
        confidence: 15,
        model: 'nexiora-extractive-v1',
        relatedQuestions: suggestRelated(input.query, []),
        betterQueries: suggestBetter(input.query),
      };
    }

    const summary = buildSummary(input.query, docs);
    await streamText(summary, 'summary', onChunk);

    const detailed = buildDetailed(input.query, input.intent, docs);
    await streamText(detailed, 'detailed', onChunk);

    const avgTrust = docs.reduce((sum, d) => sum + d.trustScore, 0) / docs.length;
    const confidence = Math.round(Math.min(92, 40 + avgTrust * 0.45 + docs.length * 3));

    return {
      summary,
      detailedMarkdown: detailed,
      confidence,
      model: 'nexiora-extractive-v1',
      relatedQuestions: suggestRelated(input.query, docs),
      betterQueries: suggestBetter(input.query),
    };
  }
}

async function streamText(
  text: string,
  field: 'summary' | 'detailed',
  onChunk?: (chunk: GenerationChunk) => void | Promise<void>,
): Promise<void> {
  if (!onChunk) return;
  // Larger chunks keep streaming responsive without hundreds of micro-awaits.
  const parts = text.match(/.{1,240}/gs) ?? [text];
  for (const part of parts) {
    await onChunk({ field, text: part });
  }
}

function buildSummary(query: string, docs: readonly RankedDocument[]): string {
  const top = docs[0]!;
  const second = docs[1];
  let text = `Here’s a clear answer to “${query}”, based on ${docs.length} sources: ${cleanDisplayText(top.snippet)}`;
  if (second?.snippet) {
    text += ` ${second.domain} also notes: ${cleanDisplayText(second.snippet)}`;
  }
  return truncate(text, 600);
}

function buildDetailed(query: string, intent: string, docs: readonly RankedDocument[]): string {
  const focus =
    intent === 'news'
      ? 'This search focused on recent coverage.'
      : intent === 'research'
        ? 'This search prioritized research and reference sources.'
        : 'This search looked across general and trusted sources.';

  const lines: string[] = [`## Answer`, ``, focus, ``, `### Key points`];

  docs.slice(0, 5).forEach((doc, i) => {
    lines.push(
      `- **[${i + 1}] ${cleanDisplayText(doc.title)}** (${doc.domain}${doc.isOfficial ? ', trusted source' : ''}): ${cleanDisplayText(doc.snippet)}`,
    );
  });

  lines.push('', '### Sources to verify', '');
  docs.forEach((doc, i) => {
    lines.push(`${i + 1}. [${cleanDisplayText(doc.title)}](${doc.url})`);
  });

  lines.push(
    '',
    '> Double-check important decisions against the original sources listed on the right.',
  );

  return lines.join('\n');
}

function suggestRelated(query: string, docs: readonly RankedDocument[]): string[] {
  const base = [
    `What are the latest developments related to ${query}?`,
    `What are common misconceptions about ${query}?`,
    `Who are the primary authorities on ${query}?`,
  ];
  if (docs[0]) {
    base.push(`Summarize ${docs[0].title} in plain language`);
  }
  return base.slice(0, 4);
}

function suggestBetter(query: string): string[] {
  return [
    `${query} official documentation`,
    `${query} latest research 2026`,
    `${query} site:gov OR site:edu`,
  ];
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}
