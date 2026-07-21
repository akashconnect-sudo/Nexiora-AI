import { describe, expect, it } from 'vitest';
import { loadTelemetryConfig } from './config';
import { sanitizeAttributes, sanitizeUrl } from './sanitize';

describe('loadTelemetryConfig', () => {
  it('stays disabled without an exporter endpoint', () => {
    const config = loadTelemetryConfig({
      OTEL_ENABLED: 'true',
      OTEL_EXPORTER_OTLP_ENDPOINT: '',
    });
    expect(config.enabled).toBe(false);
  });

  it('enables when endpoint is present', () => {
    const config = loadTelemetryConfig({
      OTEL_ENABLED: 'true',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4318',
      OTEL_SERVICE_NAME: 'nexiora-worker',
    });
    expect(config.enabled).toBe(true);
    expect(config.serviceName).toBe('nexiora-worker');
  });
});

describe('sanitizeAttributes', () => {
  it('drops sensitive keys and query strings', () => {
    const result = sanitizeAttributes({
      route: '/v1/search',
      authorization: 'Bearer secret',
      email: 'user@example.com',
      url: 'https://example.com/path?token=abc',
    });
    expect(result).toEqual({
      route: '/v1/search',
      url: 'https://example.com/path',
    });
  });
});

describe('sanitizeUrl', () => {
  it('removes query parameters', () => {
    expect(sanitizeUrl('https://example.com/a?q=secret')).toBe('https://example.com/a');
  });
});
