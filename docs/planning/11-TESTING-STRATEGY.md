# Testing Strategy

**Product:** Nexiora AI / Nova Search  
**Document:** TEST-1.0  
**Status:** Draft — Awaiting Approval

---

## 1. Pyramid

| Layer       | % effort      | Tools                                          |
| ----------- | ------------- | ---------------------------------------------- |
| Unit        | 50%           | Vitest / Jest                                  |
| Integration | 25%           | Nest testing + Testcontainers (Postgres/Redis) |
| Contract    | 10%           | OpenAPI schemathesis / Pact optional           |
| E2E         | 10%           | Playwright (web)                               |
| AI Eval     | 5% continuous | Custom eval harness                            |

---

## 2. Domain Testing (Mandatory)

- `packages/search-core`: ranking, dedupe, trust fusion — pure functions, high coverage
- Use cases with faked ports (no network)
- RBAC matrix tests

**Coverage gates (Phase 1+):** domain ≥ 80%, overall ≥ 70% on changed packages.

---

## 3. API Testing

- Supertest/light e2e against test modules
- Idempotency & rate-limit behavior
- IDOR suites for search/collections

---

## 4. UI Testing

- Component tests for Omnibox, CitationRail, AnswerStream
- Playwright: landing → search → citation visible → save bookmark
- Axe accessibility checks in CI for critical pages

---

## 5. AI Evaluation

Golden set of queries with expected:

- Must-cite domains
- Must-abstain cases
- Freshness requirements
- Language

Metrics: citation precision/recall proxies, contradiction rate, latency, cost.  
Regressions block model/prompt upgrades.

---

## 6. Load & Chaos

- k6 scripts: anon search burst, auth search, WS fan-in
- Chaos: kill one adapter; assert partial success path

---

## 7. Definition of Done (per module)

1. Unit + integration tests green
2. Docs/README updated
3. OpenAPI updated if external
4. Observability dashboards/alerts touched if new SLI
5. Security checklist for the module signed
6. No TODOs in merge path for required behavior

---

## 8. Approval

Testing gates approval required before Phase 1 merge policy lock.
