# Nexiora AI

**Nova Search** — AI Knowledge Platform monorepo.

> Planning package: [`docs/planning/00-INDEX.md`](docs/planning/00-INDEX.md)  
> Phase 0 (Foundation) is in progress / completing.

## Stack

| Layer | Technology |
|-------|------------|
| Monorepo | Turborepo + pnpm |
| API | NestJS · Prisma · PostgreSQL · Redis |
| Search infra | OpenSearch · Qdrant |
| Web | Next.js 15 · React 19 · Tailwind · `@nexiora/ui` |
| Auth | Clerk behind `IdentityProviderPort` |
| Workers | Node worker process (BullMQ in Phase 1) |

## Packages

| Package | Role |
|---------|------|
| `@nexiora/shared` | Zod contracts, plans, error codes |
| `@nexiora/search-core` | Pure ranking / dedupe / normalize |
| `@nexiora/ui` | Design tokens + primitives |
| `@nexiora/api` | NestJS modular monolith |
| `@nexiora/web` | Marketing + app shell |
| `@nexiora/worker` | Background jobs bootstrap |

## Phase gate

| Phase | Status |
|-------|--------|
| Planning | Approved |
| Phase 0 Foundation | Complete |
| Phase 1 Core Search MVP | Complete |
| Phase 2 Trust & Modes | Next |

## License

Proprietary — All rights reserved.
