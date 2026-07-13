# Development Roadmap

**Product:** Nexiora AI / Nova Search  
**Document:** ROADMAP-1.0  
**Status:** Draft — Awaiting Approval  
**Rule:** One module fully tested, documented, production-ready before the next.

---

## Phase Overview

| Phase | Name | Outcome | Est. |
|-------|------|---------|------|
| 0 | Foundation | Monorepo, CI, local stack, identity port, design tokens | 2–3 wks |
| 1 | Core Search MVP | Auth, streaming search, citations, history, Free/Pro billing web | 6–8 wks |
| 2 | Trust & Modes | Verification, filters, Research, News, PWA polish | 4–6 wks |
| 3 | Creator & Assistant | Creator mode, assistant actions, exports, API keys | 4–6 wks |
| 4 | Platform Clients | Electron, mobile, workspaces, full admin | 6–8 wks |
| 5 | Scale | Multi-region readiness, deeper indexing, cost optimizer | 6–8 wks |
| 6 | Enterprise | SSO, audit packs, VPC options, white-label prep | TBD |

---

## Phase 0 — Foundation (No product features yet)

**Build**

- Turborepo + pnpm + apps stubs (`web`, `api`, `worker`)
- Docker Compose: Postgres, Redis, OpenSearch, Qdrant
- Prisma schema (core tables) + migrate workflow
- NestJS bootstrap: config validation, Pino, OTel, health
- Identity port + Clerk integration (or Auth.js if chosen)
- `packages/ui` tokens + dark/light
- GitHub Actions: lint, typecheck, unit test, build
- OpenAPI skeleton
- ADR folder seeded

**Exit criteria:** `docker compose up` → API healthy; web renders; CI green on main.

---

## Phase 1 — Core Search MVP

**Module order (strict)**

1. Entitlements & rate limiting  
2. Search session persistence  
3. Retrieval adapters (web search + docs) — minimum 2 providers  
4. Dedupe + hybrid rank (`packages/search-core`)  
5. LLM router + streaming generation with citation markers  
6. Search REST + WS/SSE  
7. Web search UI (omnibox + results + citation rail)  
8. History + bookmarks  
9. Stripe Free/Pro  
10. Landing page (brand-first)

**Exit criteria:** Authenticated user completes cited search end-to-end in prod-like env; billing works; load test baseline recorded.

---

## Phase 2 — Trust & Modes

1. SourceTrust registry + official boost  
2. VerifierAgent + confidence calibration  
3. Full filter set (date, source, filetype, quality)  
4. Research mode + BibTeX/APA/MLA  
5. News ingestion + categories + breaking  
6. Safe search / adult filter enforcement  
7. PWA offline shell for library  

---

## Phase 3 — Creator & Assistant

1. Assistant dock grounded chat  
2. Actions: explain, summarize, translate, rewrite, compare, fact-check  
3. Export PDF/Notes; presentation outline; Excel where feasible  
4. Creator mode panel (topics, hooks, SEO, hashtags)  
5. API keys + public `/v1/search` + SDK  
6. Usage metering dashboard  

---

## Phase 4 — Platform

1. Specialized modes: Code, Academic, Shopping, Travel, Jobs, Maps, People, Companies, Healthcare, Finance (adapters phased by ROI)  
2. Workspaces & shared collections  
3. Admin panel complete  
4. Electron apps  
5. Expo mobile apps  
6. Voice + image search  

---

## Phase 5 — Scale

1. Query cache hierarchy & semantic cache  
2. Cost-aware model routing  
3. Read replicas, queue autoscaling runbooks  
4. Multi-region active-passive  
5. Selective crawler / licensed datasets expansion  
6. Advanced misinfo classifiers  

---

## Phase 6 — Enterprise

1. SAML/OIDC SSO  
2. SCIM  
3. Customer-managed keys (CMK)  
4. Dedicated deployment options  
5. DPA / SOC 2 evidence automation  

---

## Traceability (MVP sample)

| FR | Phase | Module |
|----|-------|--------|
| FR-AUTH-* | 0–1 | identity |
| FR-SEARCH-01..10,17,18,20 | 1 | search |
| FR-SEARCH-06, FR trust | 2 | verification |
| FR-NEWS-* | 2 | news |
| FR-RESEARCH-* | 2 | research |
| FR-ASSIST-* | 3 | assistant |
| FR-CREATOR-* | 3 | creator |
| FR-BILL-* | 1 | billing |
| FR-ADMIN-* | 4 | admin |
| FR-CLIENT-02/03 | 4 | desktop/mobile |

---

## Team Topology (Recommended)

| Squad | Owns |
|-------|------|
| Platform | Monorepo, CI/CD, observability |
| Search Core | Orchestrator, rank, adapters |
| AI | Prompts, router, evals |
| Experience | Web/UI |
| Growth | Billing, landing, activation |
| Trust & Safety | Verification, moderation |
| Mobile/Desktop | Clients |
| Data | Schema, OpenSearch, Qdrant |

Even with a small founding team, **wear these hats intentionally** — do not skip ownership.

---

## Approval

Approve phase order and Phase 0 exit criteria to begin scaffolding.
