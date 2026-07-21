import { describe, expect, it } from 'vitest';
import {
  DocumentEmbedJobSchema,
  JOB_NAMES,
  QUEUE_NAMES,
  SearchExecuteJobSchema,
  SourceIndexJobSchema,
  queuePrefix,
} from '../index';

describe('queue contracts', () => {
  it('keeps stable queue and job names', () => {
    expect(QUEUE_NAMES.SEARCH_EXECUTION).toBe('search-execution');
    expect(JOB_NAMES.SEARCH_EXECUTE).toBe('search.execute.v1');
    expect(queuePrefix('Production')).toBe('{nexiora:production}');
  });

  it('accepts search execute payloads that only carry searchId', () => {
    const parsed = SearchExecuteJobSchema.parse({
      version: 1,
      searchId: '11111111-1111-4111-8111-111111111111',
      requestedAt: new Date().toISOString(),
    });
    expect(parsed.searchId).toMatch(/11111111/);
    expect('query' in parsed).toBe(false);
  });

  it('rejects payloads that omit required ids', () => {
    expect(() =>
      SourceIndexJobSchema.parse({
        version: 1,
        sourceDocumentId: 'not-a-uuid',
        contentHash: 'abcd',
      }),
    ).toThrow();
  });

  it('accepts embed jobs with model metadata', () => {
    const parsed = DocumentEmbedJobSchema.parse({
      version: 1,
      sourceDocumentId: '22222222-2222-4222-8222-222222222222',
      contentHash: 'a'.repeat(16),
      model: 'text-embedding-3-small',
    });
    expect(parsed.model).toContain('embedding');
  });
});
