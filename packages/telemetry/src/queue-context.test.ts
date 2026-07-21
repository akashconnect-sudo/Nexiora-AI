import { describe, expect, it, vi } from 'vitest';
import { injectQueueContext, withQueueContext } from './queue-context';

describe('queue telemetry context', () => {
  it('returns the original payload when no active span exists', () => {
    const payload = injectQueueContext({
      version: 1,
      searchId: '11111111-1111-4111-8111-111111111111',
    });
    expect(payload.version).toBe(1);
    expect(payload.searchId).toContain('11111111');
  });

  it('executes work even without a parent trace', async () => {
    const result = await withQueueContext(undefined, 'test.span', async () => 42);
    expect(result).toBe(42);
  });

  it('propagates carrier fields into the active context callback', async () => {
    const spy = vi.fn(async () => 'ok');
    await withQueueContext(
      { traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01' },
      'test.propagated',
      spy,
    );
    expect(spy).toHaveBeenCalledOnce();
  });
});
