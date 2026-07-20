# Nexiora AI

Nova Search — an AI knowledge platform that returns cited, checkable answers.

## Live

| Service | URL |
| ------- | --- |
| App / API | [https://nexiora-ai-api.vercel.app](https://nexiora-ai-api.vercel.app/) |

Health: [https://nexiora-ai-api.vercel.app/health](https://nexiora-ai-api.vercel.app/health)

## Overview

Nexiora AI is a Turborepo monorepo for semantic search across live sources, with ranking, deduplication, and citation-grounded answers. The stack is Next.js (web), NestJS (API), PostgreSQL/Prisma, Redis, OpenSearch, and Qdrant.

## Features

- Semantic and hybrid search with source citations
- Trust-oriented ranking and deduplication
- Local email OTP auth (Resend / SMTP)
- Plan-based entitlements and Razorpay billing
- News and creator tooling surfaces
- Production deploy on a single Vercel project

## Tech stack

| Layer | Technology |
| ----- | ---------- |
| Monorepo | Turborepo + pnpm |
| Frontend | Next.js 15, React 19, Tailwind CSS |
| Backend | NestJS |
| Database | PostgreSQL + Prisma |
| Cache | Redis |
| Search | OpenSearch + Qdrant |
| Payments | Razorpay |
| Workers | BullMQ |

## Repository layout

```
apps/
  web/       # Next.js app (also hosts Nest on Vercel)
  api/       # NestJS API
  worker/    # Background jobs
packages/
  shared/    # Shared types and schemas
  search-core/
  ui/
```

## Local development

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env` and fill in required values (database, auth, Razorpay, email).

Optional infra via Docker:

```bash
docker compose up -d
```

## Status

| Phase | Status |
| ----- | ------ |
| Planning | Complete |
| Foundation | Complete |
| Core Search MVP | Complete |
| Trust & modes | In progress |

## Docs

See `docs/planning/` for architecture, API design, and deployment notes (`17-VERCEL-DEPLOY.md`).

## License

Proprietary. All rights reserved.
