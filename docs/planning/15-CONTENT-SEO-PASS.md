# Product completion note — content & SEO pass

**Date:** 2026-07-11

## Tests

All monorepo Vitest suites pass:

- `@nexiora/shared` — 2
- `@nexiora/search-core` — 4
- `@nexiora/api` — 9
- `@nexiora/web` — 3 (SEO/copy quality gates)

Web and API production builds succeed (15 web routes including `sitemap.xml` and `robots.txt`).

## SEO & content

Marketing copy lives in `apps/web/src/content/site.ts` (editorial tone, no AI filler slogans). Automated test rejects phrases like “game-changer”, “cutting-edge”, “unlock your potential”.

Pages: Home, Features, How it works, Pricing, About, News, Research, Privacy, Terms, Search (+ modes).

Technical SEO: canonical URLs, Open Graph/Twitter, FAQ + Organization + SoftwareApplication JSON-LD, sitemap, robots.

## Product additions this pass

- Source-trust registry boost in ranking
- News API (`GET /v1/news`) with live HN fallback
- Search modes: Universal / Research / News
