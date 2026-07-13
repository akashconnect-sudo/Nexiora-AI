# Phase 1 — Core Search MVP Exit

**Status:** Implemented  
**Date:** 2026-07-11

## Delivered

1. Entitlements + burst/daily rate limits (Redis with memory fallback)
2. Search session persistence (Prisma + memory hybrid repository)
3. Retrieval adapters: Wikipedia, OpenAlex, Hacker News
4. Dedupe + hybrid rank via `@nexiora/search-core`
5. LLM router (OpenAI optional) + extractive grounded synthesizer
6. REST `POST /v1/search`, `GET /v1/search/:id`, SSE `/v1/search/:id/stream`, history
7. Web Universal Search UI with summary, detailed answer, citation rail
8. Bookmarks API (`/v1/bookmarks`)
9. Billing plans + Stripe checkout when configured

## Verify

```bash
pnpm --filter @nexiora/api test
pnpm --filter @nexiora/api build
pnpm --filter @nexiora/web build

# Live search (API must be running)
curl -X POST http://localhost:3001/v1/search \
  -H "content-type: application/json" \
  -d "{\"query\":\"What is the EU AI Act?\"}"
```

## Notes

- Without Docker, search still works via memory store + live public APIs.
- Without `OPENAI_API_KEY`, answers use `nexiora-extractive-v1` (citation-grounded).
- Without Stripe keys, checkout returns configuration instructions (no fake charges).
