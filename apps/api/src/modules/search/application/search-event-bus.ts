export type SearchStreamEvent =
  | { type: 'search.status'; status: string }
  | { type: 'search.citations'; citations: unknown[] }
  | { type: 'search.token'; field: 'summary' | 'detailed'; text: string }
  | { type: 'search.enrichment'; key: string; data: unknown }
  | { type: 'search.done'; searchId: string }
  | { type: 'search.error'; code: string; message: string };

/**
 * In-process pub/sub for SSE subscribers of a search session.
 */
export class SearchEventBus {
  private readonly listeners = new Map<string, Set<(event: SearchStreamEvent) => void>>();

  subscribe(searchId: string, listener: (event: SearchStreamEvent) => void): () => void {
    const set = this.listeners.get(searchId) ?? new Set();
    set.add(listener);
    this.listeners.set(searchId, set);
    return () => {
      set.delete(listener);
      if (set.size === 0) {
        this.listeners.delete(searchId);
      }
    };
  }

  publish(searchId: string, event: SearchStreamEvent): void {
    const set = this.listeners.get(searchId);
    if (!set) return;
    for (const listener of set) {
      listener(event);
    }
  }
}

export const SEARCH_EVENT_BUS = Symbol('SEARCH_EVENT_BUS');
