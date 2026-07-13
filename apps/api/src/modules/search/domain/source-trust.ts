/**
 * High-trust domain registry used to boost ranking before generation.
 * Values are editorial judgments for Phase 2; admins can override via SourceTrust table later.
 */
export const SOURCE_TRUST_REGISTRY: Record<
  string,
  { baseTrust: number; isOfficial: boolean; category: string }
> = {
  'wikipedia.org': { baseTrust: 88, isOfficial: true, category: 'reference' },
  'en.wikipedia.org': { baseTrust: 88, isOfficial: true, category: 'reference' },
  'europa.eu': { baseTrust: 96, isOfficial: true, category: 'government' },
  'who.int': { baseTrust: 95, isOfficial: true, category: 'health' },
  'nih.gov': { baseTrust: 95, isOfficial: true, category: 'health' },
  'nasa.gov': { baseTrust: 94, isOfficial: true, category: 'science' },
  'nature.com': { baseTrust: 93, isOfficial: false, category: 'academic' },
  'science.org': { baseTrust: 93, isOfficial: false, category: 'academic' },
  'arxiv.org': { baseTrust: 86, isOfficial: false, category: 'academic' },
  'openalex.org': { baseTrust: 90, isOfficial: true, category: 'academic' },
  'doi.org': { baseTrust: 90, isOfficial: true, category: 'academic' },
  'github.com': { baseTrust: 78, isOfficial: false, category: 'code' },
  'developer.mozilla.org': { baseTrust: 92, isOfficial: true, category: 'docs' },
  'w3.org': { baseTrust: 94, isOfficial: true, category: 'standards' },
  'ietf.org': { baseTrust: 94, isOfficial: true, category: 'standards' },
  'reuters.com': { baseTrust: 84, isOfficial: false, category: 'news' },
  'apnews.com': { baseTrust: 84, isOfficial: false, category: 'news' },
  'bbc.com': { baseTrust: 82, isOfficial: false, category: 'news' },
  'bbc.co.uk': { baseTrust: 82, isOfficial: false, category: 'news' },
};

export function applySourceTrustBoost<
  T extends { domain: string; trustScore: number; isOfficial: boolean },
>(doc: T): T {
  const entry = SOURCE_TRUST_REGISTRY[doc.domain.toLowerCase()];
  if (!entry) return doc;
  return {
    ...doc,
    trustScore: Math.max(doc.trustScore, entry.baseTrust),
    isOfficial: doc.isOfficial || entry.isOfficial,
  };
}
