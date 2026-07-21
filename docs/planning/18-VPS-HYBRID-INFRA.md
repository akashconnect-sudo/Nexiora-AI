# Nexiora VPS Hybrid Infrastructure

This stack keeps Next.js/NestJS on Vercel and runs Redis, OpenSearch, Qdrant, BullMQ workers, and a local OpenTelemetry Collector on a VPS.

## Capacity note

The Compose profile targets a **4 GB RAM** VPS with strict memory limits:

| Service | Limit |
| --- | --- |
| OpenSearch | 1280 MB (512 MB JVM heap) |
| Qdrant | 512 MB |
| Worker | 768 MB |
| Redis | 256 MB |
| OTel Collector | 192 MB |

**8 GB RAM is recommended** before enabling heavy indexing write traffic or raising OpenSearch heap.

PostgreSQL stays on managed hosting (for example Supabase) so the VPS is not exhausted by the database.

## Bootstrap

1. Copy `.env.example` values onto the VPS as `.env`.
2. Set secure Redis/OpenSearch/Qdrant endpoints that Vercel can reach (TLS reverse proxy recommended).
3. Start infrastructure:

```bash
docker compose -f docker-compose.vps.yml up -d redis opensearch qdrant otel-collector
docker compose -f docker-compose.vps.yml up -d --build worker
```

4. On Vercel (web/API), set:

```bash
REDIS_URL=rediss://:<password>@vps.example.com:6379
OPENSEARCH_NODE=https://opensearch.example.com
QDRANT_URL=https://qdrant.example.com
SEARCH_EXECUTION_MODE=queue
SEARCH_INDEX_READ_MODE=off
SEARCH_INDEX_WRITE_ENABLED=false
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.example.com
```

## Staged search rollout

1. `SEARCH_INDEX_READ_MODE=off` while indexes warm up.
2. Enable `SEARCH_INDEX_WRITE_ENABLED=true` so live citations are indexed asynchronously.
3. Switch to `shadow` and compare latency/quality.
4. Enable `on` so indexed hits are fused with live Wikipedia/OpenAlex/Hacker News results.

Live adapters always remain registered. OpenSearch/Qdrant failures degrade gracefully to the existing live pipeline.

## Worker commands

```bash
pnpm --filter @nexiora/api build
pnpm --filter @nexiora/api worker
```
