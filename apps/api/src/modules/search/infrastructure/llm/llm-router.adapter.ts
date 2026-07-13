import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../../bootstrap/app-config.service';
import type {
  GenerationChunk,
  GenerationInput,
  GenerationPort,
  GenerationResult,
} from '../../application/ports/generation.port';
import { ExtractiveGenerationAdapter } from './extractive-generation.adapter';

/**
 * Routes to OpenAI when configured; otherwise extractive grounded synthesizer.
 */
@Injectable()
export class LlmRouterAdapter implements GenerationPort {
  private readonly logger = new Logger(LlmRouterAdapter.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly extractive: ExtractiveGenerationAdapter,
  ) {}

  async generate(
    input: GenerationInput,
    onChunk?: (chunk: GenerationChunk) => void | Promise<void>,
  ): Promise<GenerationResult> {
    if (!this.config.openaiApiKey) {
      return this.extractive.generate(input, onChunk);
    }

    try {
      return await this.generateWithOpenAi(input, onChunk);
    } catch (error) {
      this.logger.warn(`OpenAI generation failed; falling back: ${(error as Error).message}`);
      return this.extractive.generate(input, onChunk);
    }
  }

  private async generateWithOpenAi(
    input: GenerationInput,
    onChunk?: (chunk: GenerationChunk) => void | Promise<void>,
  ): Promise<GenerationResult> {
    const sources = input.documents
      .slice(0, 8)
      .map(
        (d, i) =>
          `[${i + 1}] ${d.title} | ${d.url} | trust=${d.trustScore}\n${d.snippet}`,
      )
      .join('\n\n');

    const system = `You are Nova Search by Nexiora AI. Answer ONLY using the numbered sources. Cite as [n]. If sources are insufficient, say so. Return JSON with keys: summary, detailedMarkdown, confidence (0-100), relatedQuestions (string[]), betterQueries (string[]).`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.openaiModel,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: `Query: ${input.query}\nIntent: ${input.intent}\n\nSources:\n${sources}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) {
      throw new Error(`OpenAI HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty OpenAI response');
    }

    const parsed = JSON.parse(content) as {
      summary: string;
      detailedMarkdown: string;
      confidence: number;
      relatedQuestions?: string[];
      betterQueries?: string[];
    };

    await onChunk?.({ field: 'summary', text: parsed.summary });
    await onChunk?.({ field: 'detailed', text: parsed.detailedMarkdown });

    return {
      summary: parsed.summary,
      detailedMarkdown: parsed.detailedMarkdown,
      confidence: Number(parsed.confidence) || 70,
      model: this.config.openaiModel,
      relatedQuestions: parsed.relatedQuestions ?? [],
      betterQueries: parsed.betterQueries ?? [],
    };
  }
}
