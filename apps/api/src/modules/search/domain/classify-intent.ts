/**
 * Lightweight intent classification for the query planner.
 */
export function classifyIntent(query: string, mode: string): string {
  const q = query.toLowerCase();

  if (mode === 'news' || /\b(news|breaking|headline|today)\b/.test(q)) {
    return 'news';
  }
  if (mode === 'research' || mode === 'academic' || /\b(paper|study|doi|arxiv|cite)\b/.test(q)) {
    return 'research';
  }
  if (mode === 'code' || /\b(github|npm|stack overflow|typescript|python error)\b/.test(q)) {
    return 'code';
  }
  if (/^(who is|what is|define|meaning of)\b/.test(q)) {
    return 'informational';
  }
  if (/\b(vs|versus|compare|difference between)\b/.test(q)) {
    return 'compare';
  }
  if (/\b(how to|steps|tutorial|guide)\b/.test(q)) {
    return 'how_to';
  }
  return 'informational';
}
