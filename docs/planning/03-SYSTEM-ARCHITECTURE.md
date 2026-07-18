# System Architecture

**Product:** Nexiora AI / Nova Search  
**Document:** ARCH-1.0  
**Status:** Draft — Awaiting Approval

---

## 1. Architectural Style

| Principle          | Application                                                      |
| ------------------ | ---------------------------------------------------------------- |
| Clean Architecture | Domain ← Application ← Infrastructure; UI is a driver            |
| DDD                | Bounded contexts with ubiquitous language                        |
| SOLID              | Enforced via module boundaries & DI (NestJS)                     |
| CQRS (light)       | Commands for mutations; queries for read models where beneficial |
| Event-driven       | Domain events → BullMQ for async fan-out                         |
| Hexagonal          | Ports/adapters for LLMs, search providers, storage               |

**Clients never talk to providers directly.** All AI and retrieval go through the Search Orchestrator.

---

## 2. Bounded Contexts

| Context              | Responsibility                            | Owns                                  |
| -------------------- | ----------------------------------------- | ------------------------------------- |
| Identity & Access    | AuthN, sessions, passkeys, 2FA            | User identity projections             |
| Tenancy & Workspace  | Orgs, members, roles                      | Workspace aggregate                   |
| Search Orchestration | Intent, planning, fusion, ranking         | SearchSession, Answer                 |
| Retrieval            | Source adapters, dedupe                   | RetrievedDocument (transient + cache) |
| Trust & Verification | Trust scores, misinfo signals, fact-check | SourceTrust, VerificationReport       |
| Generation           | LLM routing, streaming, prompts           | GenerationJob                         |
| Library              | History, bookmarks, collections, notes    | Collection, Bookmark                  |
| News & Trends        | Feeds, breaking, trending topics          | NewsItem, TrendSignal                 |
| Creator              | Ideation artifacts                        | CreatorInsight                        |
| Research             | Academic ranking, citation formats        | CitationExport                        |
| Billing              | Plans, entitlements, Lemon Squeezy sync  | Subscription, Entitlement             |
| Developer Platform   | API keys, metering                        | ApiKey, UsageRecord                   |
| Notification         | In-app, email, push                       | Notification                          |
| Admin & Audit        | RBAC admin, moderation, audit             | AuditLog, ModerationCase              |
| Observability        | Not a domain — cross-cutting              | —                                     |

---

## 3. Logical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Presentation                                                │
│  apps/web (Next.js 15) · apps/desktop (Electron)             │
│  apps/mobile (RN/Expo) · apps/admin                          │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS / WSS
┌────────────────────────────▼────────────────────────────────┐
│  Edge: Cloudflare WAF · CDN · Rate limit · Bot management    │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│  API Gateway / NestJS Gateway                                │
│  REST /v1 · GraphQL · WebSocket gateway · Auth middleware    │
└───┬──────────┬──────────┬──────────┬──────────┬─────────────┘
    │          │          │          │          │
┌───▼───┐ ┌────▼────┐ ┌───▼────┐ ┌──▼───┐ ┌────▼────┐
│Identity│ │ Billing │ │ Search │ │ News │ │ Library │
│Module  │ │ Module  │ │ Module │ │Module│ │ Module  │
└────────┘ └─────────┘ └───┬────┘ └──────┘ └─────────┘
                           │
              ┌────────────▼────────────┐
              │ Search Orchestrator      │
              │ Intent → Plan → Retrieve │
              │ → Dedupe → Rank → Verify │
              │ → Generate → Stream      │
              └────────────┬────────────┘
         ┌─────────┬───────┼───────┬─────────┐
         ▼         ▼       ▼       ▼         ▼
      Adapters  OpenSearch Qdrant  LLMs    Object Store
```

---

## 4. Search Pipeline (Core)

### 4.1 Synchronous path (user-perceived)

1. **Ingest query** — validate (Zod), normalize, attach user/plan context
2. **Policy gate** — rate limit, safe search, entitlement
3. **Intent classifier** — lightweight model or rules+LLM hybrid
4. **Query planner** — select modes, adapters, filters, model tier
5. **Parallel retrieve** — BullMQ jobs or Promise.allSettled for adapters
6. **Normalize** — canonical `RetrievedDocument` schema
7. **Dedupe** — URL canonicalization + embedding similarity
8. **Rank** — hybrid: BM25 (OpenSearch) + vector (Qdrant) + trust + freshness
9. **Verify** — claim extraction + source agreement + misinfo heuristics
10. **Generate** — stream summary + detailed answer with forced citation markers
11. **Enrich** — related Qs, media, news, creator/research panels
12. **Persist** — SearchSession + Answer + Citation links (unless private mode)
13. **Meter** — usage + cost attribution

### 4.2 Degradation

| Failure                                 | Behavior                                       |
| --------------------------------------- | ---------------------------------------------- |
| One adapter timeout                     | Continue with others; flag incomplete coverage |
| Primary LLM down                        | Fail over to secondary in router               |
| Verification timeout                    | Serve answer with reduced confidence + warning |
| Cache hit on identical normalized query | Skip retrieve/generate; revalidate TTL         |

### 4.3 Agent roles (internal)

- **PlannerAgent** — tool/adapter selection
- **RetrieverAgent** — adapter execution
- **VerifierAgent** — fact-check / contradiction
- **WriterAgent** — grounded generation
- **CreatorAgent** — ideation (optional)
- **ResearchAgent** — citation formatting & academic bias

Agents share a tool interface; no agent bypasses trust/citation policy.

---

## 5. Technology Mapping (Locked Recommendations)

| Concern     | Choice                   | Rationale                                           |
| ----------- | ------------------------ | --------------------------------------------------- |
| API         | NestJS + Prisma          | Modular DI, enterprise structure                    |
| Web         | Next.js 15 App Router    | SSR/streaming, PWA                                  |
| Auth        | Clerk (Phase 0)          | Passkeys/OAuth speed; abstract behind Identity port |
| DB          | PostgreSQL 16            | Relational source of truth                          |
| Cache/Queue | Redis + BullMQ           | Rate limits, jobs, hot cache                        |
| Lexical     | OpenSearch               | Filters, news, full-text                            |
| Vector      | Qdrant                   | Self-host, filterable payloads                      |
| Objects     | R2 primary, S3 backup    | Cost + Cloudflare adjacency                         |
| Desktop     | Electron + shared web UI | Code reuse                                          |
| Mobile      | Expo React Native        | Shared design tokens; native feel                   |
| Monorepo    | Turborepo + pnpm         | Shared packages                                     |

**GraphQL:** secondary for dashboard aggregations; REST remains canonical for Search and public API.

---

## 6. Clean Architecture Layers (Backend)

```
apps/api/
  src/
    modules/<context>/
      domain/          # entities, value objects, domain services, events
      application/     # use cases, ports (interfaces), DTOs
      infrastructure/  # Prisma, Redis, providers, adapters
      presentation/    # controllers, resolvers, gateway handlers
```

**Dependency rule:** `domain` has zero framework imports.  
**Prisma** lives only in `infrastructure`.  
**Use cases** orchestrate ports; tested with fakes.

---

## 7. Cross-Cutting

| Concern       | Implementation                                |
| ------------- | --------------------------------------------- |
| AuthZ         | RBAC + resource ABAC (workspace membership)   |
| Validation    | Zod at edges; domain invariants inside        |
| Errors        | Typed domain errors → Problem+JSON            |
| Logging       | Pino + OTel correlation IDs                   |
| Config        | `@nestjs/config` + schema validation at boot  |
| Feature flags | Config service + DB flags for gradual rollout |

---

## 8. Multi-Client Strategy

```
packages/ui          — design system (web)
packages/api-client  — typed SDK from OpenAPI
packages/domain-shared — Zod schemas shared FE/BE where safe
packages/config      — eslint, tsconfig, tailwind presets
```

- **Web/PWA:** Next.js
- **Electron:** loads production web or packaged renderer; deep links; OS search shortcut
- **Mobile:** native navigation; WebView only for legal/markdown if needed — prefer native screens calling same API

---

## 9. Data Flow — Streaming Search

```
Client                API                  Workers              Providers
  │  POST /v1/search    │                     │                     │
  │────────────────────►│ create session      │                     │
  │◄──── 202 + id ──────│ enqueue plan        │                     │
  │  WS subscribe       │                     │                     │
  │────────────────────►│                     │                     │
  │                     │────────────────────►│ retrieve            │
  │                     │                     │────────────────────►│
  │                     │                     │◄──── docs ──────────│
  │◄── ws:citations ────│◄──── ranked ────────│                     │
  │◄── ws:token… ───────│◄──── stream ────────│◄──── LLM ───────────│
  │◄── ws:done ─────────│ persist + meter     │                     │
```

REST fallback: `GET /v1/search/:id/stream` SSE for environments blocking WS.

---

## 10. Scalability Topology

- **API pods:** HPA on CPU + in-flight searches
- **Worker pods:** HPA on BullMQ depth
- **Redis:** cluster mode in prod
- **Postgres:** primary + read replicas for history/analytics
- **OpenSearch / Qdrant:** dedicated nodes; snapshots daily
- **CDN:** static assets + image optimization

---

## 11. Disaster Recovery

- RPO ≤ 15 min (WAL archiving)
- RTO ≤ 1 h (runbooks)
- Multi-AZ mandatory; multi-region Phase 5

---

## 12. Architecture Decision Records (Initial)

| ADR     | Decision                                                      | Status   |
| ------- | ------------------------------------------------------------- | -------- |
| ADR-001 | Turborepo monorepo                                            | Proposed |
| ADR-002 | NestJS modular monolith → extract services when scale demands | Proposed |
| ADR-003 | Modular monolith first (not microservices day 1)              | Proposed |
| ADR-004 | Qdrant over Pinecone as primary                               | Proposed |
| ADR-005 | Clerk behind Identity port                                    | Proposed |
| ADR-006 | Expo for mobile                                               | Proposed |
| ADR-007 | Citation-mandatory generation policy                          | Proposed |

**ADR-003 rationale:** A modular NestJS monolith with clear boundaries ships faster and avoids distributed complexity until traffic justifies Search Worker / Billing service splits.

---

## 13. Approval

Architecture review sign-off required before Phase 0 scaffolding.
