# Phase 0 — Foundation Exit Checklist

**Date:** 2026-07-11

## Delivered

- [x] Turborepo + pnpm monorepo
- [x] `apps/api` NestJS with config validation, Pino, Swagger/OpenAPI
- [x] Health `/health` + readiness `/ready`
- [x] Prisma schema (core tables from DB plan)
- [x] Identity port + Clerk adapter + AuthGuard + `/v1/auth/*`
- [x] Redis + Prisma infrastructure modules
- [x] `@nexiora/shared` + `@nexiora/search-core` with unit tests
- [x] `@nexiora/ui` tokens (teal accent, light/dark CSS variables)
- [x] `apps/web` Next.js landing (brand-first hero + functional search box)
- [x] `apps/worker` bootstrap process
- [x] `docker-compose.yml` (Postgres, Redis, OpenSearch, Qdrant)
- [x] GitHub Actions CI
- [x] ADRs 001–005
- [x] OpenAPI v0.1 snapshot

## Local verification commands

```bash
pnpm install
pnpm --filter @nexiora/shared build
pnpm --filter @nexiora/search-core build
pnpm --filter @nexiora/api exec prisma generate
pnpm build
pnpm typecheck
pnpm test
```

## Notes

- Docker is required for `/ready` to report `ready` (Postgres + Redis).
- Clerk keys optional for boot; auth-required routes reject until configured.
- PWA icons: add `apps/web/public/icons/icon-192.png` and `icon-512.png` before store packaging.
