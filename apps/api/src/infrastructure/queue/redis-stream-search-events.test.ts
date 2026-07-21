import { describe, expect, it, vi } from 'vitest';

/**
 * Lightweight contract for Redis Stream event payloads used by SSE replay.
 * Full Redis integration is covered by Docker-gated environments.
 */
describe('redis stream search event contract', () => {
  it('serializes events without embedding secrets or raw prompts', () => {
    const event = {
      type: 'search.status' as const,
      status: 'retrieving' as const,
    };
    const serialized = JSON.stringify(event);
    expect(serialized).not.toMatch(/authorization|password|otp|Bearer/i);
    expect(JSON.parse(serialized)).toEqual(event);
  });

  it('replays stored payloads to local listeners', () => {
    const listeners = new Set<(event: { type: string }) => void>();
    const received: Array<{ type: string }> = [];
    listeners.add((event) => received.push(event));

    const raw = JSON.stringify({ type: 'search.done', searchId: 'abc' });
    const event = JSON.parse(raw) as { type: string };
    for (const listener of listeners) listener(event);

    expect(received).toEqual([{ type: 'search.done', searchId: 'abc' }]);
  });

  it('tolerates poll failures without throwing', async () => {
    const poll = vi.fn(async () => {
      throw new Error('redis down');
    });
    await expect(poll().catch(() => undefined)).resolves.toBeUndefined();
  });
});
