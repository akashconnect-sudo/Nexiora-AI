import { describe, expect, it } from 'vitest';
import { classifyIntent } from './classify-intent';

describe('classifyIntent', () => {
  it('detects research intent from query terms', () => {
    expect(classifyIntent('latest arxiv paper on transformers', 'universal')).toBe('research');
  });

  it('respects explicit news mode', () => {
    expect(classifyIntent('market update', 'news')).toBe('news');
  });

  it('defaults to informational', () => {
    expect(classifyIntent('what is photosynthesis', 'universal')).toBe('informational');
  });
});
