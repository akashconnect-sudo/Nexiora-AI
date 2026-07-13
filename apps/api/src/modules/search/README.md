# Search Module (Nova Search)

Bounded context for universal AI search orchestration.

## Pipeline

1. Validate + entitlements
2. Persist session
3. Parallel retrieve (Wikipedia, OpenAlex, Hacker News)
4. Dedupe + hybrid rank (`@nexiora/search-core`)
5. Generate (OpenAI if keyed, else extractive grounded synthesizer)
6. Stream via SSE + complete persistence

## Adapters

| Adapter | Auth | Role |
|---------|------|------|
| Wikipedia | none | Encyclopedic / docs |
| OpenAlex | none | Academic |
| Hacker News | none | Tech discussion freshness |
| OpenAI (optional) | `OPENAI_API_KEY` | Generative synthesis |
