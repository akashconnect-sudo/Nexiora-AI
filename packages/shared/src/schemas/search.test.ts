import { describe, expect, it } from 'vitest';
import { CreateSearchRequestSchema } from './search';

describe('CreateSearchRequestSchema', () => {
  it('accepts a minimal valid query', () => {
    const parsed = CreateSearchRequestSchema.parse({ query: 'What is Nexiora AI?' });
    expect(parsed.mode).toBe('universal');
    expect(parsed.options.stream).toBe(true);
  });

  it('rejects empty queries', () => {
    expect(() => CreateSearchRequestSchema.parse({ query: '   ' })).toThrow();
  });
});
