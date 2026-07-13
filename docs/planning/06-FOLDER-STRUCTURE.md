# Folder Structure

**Product:** Nexiora AI / Nova Search  
**Document:** STRUCT-1.0  
**Status:** Draft — Awaiting Approval  
**Layout:** Turborepo + pnpm workspaces · Feature-based modules

---

## 1. Monorepo Tree

```
nexiora-ai/
├── apps/
│   ├── web/                      # Next.js 15 — marketing + app shell + PWA
│   ├── admin/                    # Admin console (Next.js)
│   ├── api/                      # NestJS API (modular monolith)
│   ├── worker/                   # BullMQ workers (can share api code)
│   ├── desktop/                  # Electron wrapper
│   └── mobile/                   # Expo React Native
├── packages/
│   ├── ui/                       # Design system (Shadcn-based, tokens)
│   ├── config-eslint/
│   ├── config-typescript/
│   ├── config-tailwind/
│   ├── api-client/               # Generated OpenAPI client
│   ├── sdk/                      # Public developer SDK
│   ├── shared/                   # Zod schemas, constants, result types
│   ├── search-core/              # Pure TS ranking/dedupe/trust (no Nest)
│   └── observability/            # OTel helpers
├── docs/
│   ├── planning/                 # This package
│   ├── adr/                      # Architecture Decision Records
│   ├── runbooks/
│   └── api/                      # OpenAPI published snapshots
├── infrastructure/
│   ├── docker/
│   ├── k8s/
│   ├── terraform/
│   └── monitoring/               # Grafana dashboards, Prometheus rules
├── scripts/
│   ├── bootstrap.sh
│   ├── generate-client.ts
│   └── seed-trust-domains.ts
├── .github/workflows/
├── docker-compose.yml            # Local: api, db, redis, opensearch, qdrant
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .env.example
├── LICENSE
└── README.md
```

---

## 2. API Module Layout (NestJS + Clean Architecture)

```
apps/api/src/
├── main.ts
├── app.module.ts
├── bootstrap/
│   ├── config.schema.ts
│   ├── logger.ts
│   └── telemetry.ts
├── common/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   └── problem-details/
├── modules/
│   ├── identity/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── workspace/
│   ├── search/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   ├── value-objects/
│   │   │   ├── services/
│   │   │   └── events/
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   ├── ports/
│   │   │   └── dto/
│   │   ├── infrastructure/
│   │   │   ├── prisma/
│   │   │   ├── adapters/          # google, brave, youtube, academic...
│   │   │   ├── llm/
│   │   │   ├── opensearch/
│   │   │   ├── qdrant/
│   │   │   └── queue/
│   │   └── presentation/
│   │       ├── search.controller.ts
│   │       ├── search.gateway.ts
│   │       └── search.resolver.ts
│   ├── verification/
│   ├── library/
│   ├── news/
│   ├── creator/
│   ├── research/
│   ├── billing/
│   ├── developer/
│   ├── notification/
│   ├── admin/
│   └── audit/
└── prisma/
    ├── schema.prisma
    └── migrations/
```

---

## 3. Web App Feature Layout

```
apps/web/src/
├── app/                          # App Router
│   ├── (marketing)/
│   │   ├── page.tsx              # Landing
│   │   ├── pricing/
│   │   └── ...
│   ├── (auth)/
│   ├── (app)/                    # Authenticated shell
│   │   ├── dashboard/
│   │   ├── search/
│   │   ├── news/
│   │   ├── collections/
│   │   ├── settings/
│   │   └── ...
│   ├── api/                      # BFF route handlers if needed
│   ├── layout.tsx
│   └── providers.tsx
├── features/
│   ├── search/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── schemas/
│   ├── news/
│   ├── creator/
│   ├── research/
│   ├── library/
│   ├── billing/
│   └── settings/
├── shared/
│   ├── components/
│   ├── lib/
│   └── hooks/
└── styles/
```

**Rule:** Features do not import from other features’ internals — only from `shared` / `packages/ui`.

---

## 4. Documentation Rule

- Every public module exports a `README.md` describing purpose, boundaries, and public API.
- Domain functions: TSDoc with intent, params, invariants.
- Prefer clarity over noise — no redundant comments that restate the code.

---

## 5. Approval

Monorepo layout approval required before `turbo` scaffolding (Phase 0).
