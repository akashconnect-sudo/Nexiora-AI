import type { RankedDocument } from '@nexiora/search-core';

export interface GenerationChunk {
  readonly field: 'summary' | 'detailed';
  readonly text: string;
}

export interface GenerationResult {
  readonly summary: string;
  readonly detailedMarkdown: string;
  readonly confidence: number;
  readonly model: string;
  readonly relatedQuestions: string[];
  readonly betterQueries: string[];
}

export interface GenerationInput {
  readonly query: string;
  readonly intent: string;
  readonly documents: readonly RankedDocument[];
}

/**
 * Port for answer generation (LLM or extractive grounded synthesizer).
 */
export interface GenerationPort {
  generate(
    input: GenerationInput,
    onChunk?: (chunk: GenerationChunk) => void | Promise<void>,
  ): Promise<GenerationResult>;
}

export const GENERATION_PORT = Symbol('GENERATION_PORT');
