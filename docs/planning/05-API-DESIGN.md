# API Design

**Product:** Nexiora AI / Nova Search  
**Document:** API-1.0  
**Status:** Draft — Awaiting Approval  
**Base URL:** `https://api.nexiora.ai/v1`  
**Protocols:** REST (canonical), GraphQL (secondary), WebSocket/SSE (streaming)

---

## 1. Conventions

| Topic | Rule |
|-------|------|
| Versioning | URL `/v1`; breaking changes → `/v2` |
| Format | JSON; Problem Details (`application/problem+json`) for errors |
| Auth | `Authorization: Bearer <jwt>` or `X-Api-Key: nx_...` |
| IDs | UUID strings |
| Time | ISO-8601 UTC |
| Pagination | Cursor: `?cursor=&limit=` (default 20, max 100) |
| Idempotency | `Idempotency-Key` on POST search & billing |
| Rate limit headers | `X-RateLimit-Limit`, `Remaining`, `Reset` |
| Request ID | `X-Request-Id` echoed |

---

## 2. Error Model

```json
{
  "type": "https://api.nexiora.ai/errors/rate-limited",
  "title": "Rate limit exceeded",
  "status": 429,
  "detail": "Daily search quota exhausted for plan free",
  "instance": "/v1/search",
  "requestId": "req_...",
  "code": "RATE_LIMITED"
}
```

Common codes: `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`, `RATE_LIMITED`, `QUOTA_EXCEEDED`, `PROVIDER_UNAVAILABLE`, `SEARCH_FAILED`.

---

## 3. REST Endpoints

### 3.1 Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Liveness |
| GET | `/ready` | No | Readiness (db/redis) |

### 3.2 Auth (if self-managed routes; Clerk may own hosted UI)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/session` | Exchange provider token → app session |
| POST | `/auth/logout` | Revoke refresh |
| GET | `/auth/me` | Current user profile |
| PATCH | `/auth/me` | Update profile/settings |
| GET | `/auth/sessions` | List devices |
| DELETE | `/auth/sessions/:id` | Revoke device |

### 3.3 Search

| Method | Path | Description |
|--------|------|-------------|
| POST | `/search` | Create search session (async) |
| GET | `/search/:id` | Get session + answer |
| GET | `/search/:id/stream` | SSE token stream |
| POST | `/search/:id/cancel` | Cancel in-flight |
| GET | `/search` | History (auth) |
| DELETE | `/search/:id` | Soft-delete from history |
| POST | `/search/suggest` | Autocomplete / reformulations |
| POST | `/search/voice` | Upload audio → query text |
| POST | `/search/image` | Image query bootstrap |

#### POST `/search` body

```json
{
  "query": "What changed in EU AI Act enforcement 2026?",
  "mode": "research",
  "filters": {
    "country": "EU",
    "language": "en",
    "dateFrom": "2026-01-01",
    "dateTo": null,
    "sources": ["government", "news", "academic"],
    "fileTypes": ["pdf"],
    "quality": ["most_accurate", "official_only"]
  },
  "options": {
    "creatorMode": false,
    "private": false,
    "stream": true
  },
  "workspaceId": null
}
```

#### Response `202`

```json
{
  "id": "8f3c...",
  "status": "pending",
  "streamUrl": "/v1/search/8f3c.../stream",
  "wsChannel": "search:8f3c..."
}
```

#### Completed answer shape (`GET /search/:id`)

```json
{
  "id": "8f3c...",
  "query": "...",
  "intent": "research",
  "status": "completed",
  "answer": {
    "summary": "...",
    "detailedMarkdown": "...",
    "confidence": 86.5,
    "verificationStatus": "partial",
    "model": "claude-sonnet-4-..."
  },
  "citations": [
    {
      "ordinal": 1,
      "title": "...",
      "url": "https://...",
      "domain": "europa.eu",
      "sourceType": "government",
      "isOfficial": true,
      "trustScore": 96.0,
      "confidence": 91.0,
      "publishedAt": "2026-03-01T00:00:00Z",
      "snippet": "..."
    }
  ],
  "enrichments": {
    "relatedQuestions": ["..."],
    "betterQueries": ["..."],
    "images": [],
    "videos": [],
    "news": [],
    "creator": null,
    "research": { "citationFormats": ["apa", "mla", "bibtex"] }
  },
  "latencyMs": 4200,
  "createdAt": "..."
}
```

### 3.4 Assistant

| Method | Path | Description |
|--------|------|-------------|
| POST | `/assistant/chat` | Chat grounded on `searchId` |
| POST | `/assistant/actions` | explain\|summarize\|translate\|rewrite\|compare\|fact_check\|export |

### 3.5 Library

| Method | Path | Description |
|--------|------|-------------|
| CRUD | `/collections` | Collections |
| CRUD | `/bookmarks` | Bookmarks |
| CRUD | `/notes` | Notes |
| CRUD | `/saved-searches` | Saved searches |

### 3.6 News & Trends

| Method | Path | Description |
|--------|------|-------------|
| GET | `/news` | `?category=&country=&cursor=` |
| GET | `/news/breaking` | Breaking set |
| GET | `/trends` | Trending topics |

### 3.7 Billing

| Method | Path | Description |
|--------|------|-------------|
| GET | `/billing/plans` | Public plans |
| POST | `/billing/checkout` | Stripe checkout session |
| POST | `/billing/portal` | Customer portal |
| GET | `/billing/subscription` | Current sub |
| POST | `/billing/webhooks/stripe` | Stripe webhook |

### 3.8 Developer

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api-keys` | List/create |
| DELETE | `/api-keys/:id` | Revoke |
| GET | `/usage` | Usage metrics |

### 3.9 Admin (role-gated)

| Method | Path | Description |
|--------|------|-------------|
| GET/PATCH | `/admin/users` | User admin |
| GET | `/admin/analytics/overview` | KPIs |
| GET | `/admin/audit-logs` | Audit |
| GET/PATCH | `/admin/moderation` | Cases |
| GET | `/admin/security/dashboard` | Security metrics |

### 3.10 Privacy

| Method | Path | Description |
|--------|------|-------------|
| POST | `/privacy/export` | Request data export |
| POST | `/privacy/delete-account` | Schedule deletion |

---

## 4. WebSocket Protocol

**URL:** `wss://api.nexiora.ai/ws`  
**Auth:** `Bearer` via query `token=` (short-lived) or first message `auth`.

### Client → Server

```json
{ "type": "subscribe", "channel": "search:<id>" }
{ "type": "assistant.send", "searchId": "...", "message": "..." }
```

### Server → Client

```json
{ "type": "search.status", "status": "retrieving" }
{ "type": "search.citations", "citations": [/* partial */] }
{ "type": "search.token", "field": "summary", "text": "..." }
{ "type": "search.enrichment", "key": "relatedQuestions", "data": [] }
{ "type": "search.done", "searchId": "..." }
{ "type": "search.error", "code": "SEARCH_FAILED", "message": "..." }
{ "type": "notification", "payload": {} }
```

---

## 5. GraphQL (Secondary)

Use for admin/dashboard composites:

```graphql
type Query {
  me: User!
  searchHistory(cursor: String, limit: Int): SearchConnection!
  collection(id: ID!): Collection
  adminOverview: AdminOverview @auth(role: ADMIN)
}
```

Mutations for search remain REST to simplify streaming and idempotency.

---

## 6. Public SDK Surface

`@nexiora/sdk` (TypeScript):

```ts
const nexiora = new Nexiora({ apiKey: process.env.NEXIORA_API_KEY });
const run = await nexiora.search.create({ query: "...", mode: "universal" });
for await (const ev of nexiora.search.stream(run.id)) { /* ... */ }
```

---

## 7. Compatibility & Deprecation

- Announce deprecations 90 days prior
- Sunset headers: `Deprecation`, `Sunset`
- Contract tests in CI against OpenAPI

---

## 8. Approval

API contract freeze for MVP endpoints before public SDK publish.
