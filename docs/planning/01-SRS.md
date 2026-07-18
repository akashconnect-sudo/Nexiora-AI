# Software Requirements Specification (SRS)

**Product:** Nexiora AI / Nova Search  
**Document:** SRS-1.0  
**Status:** Draft — Awaiting Approval

---

## 1. Introduction

### 1.1 Purpose

This SRS defines the complete software requirements for **Nexiora AI**, an enterprise AI Knowledge Platform whose primary product is **Nova Search** — an AI-powered search and knowledge system that synthesizes trustworthy, real-time information from the open web and curated sources.

Nova Search is **not** a traditional keyword search engine. It is an intent-aware, multi-source, citation-first knowledge system combining retrieval, ranking, verification, and generative synthesis.

### 1.2 Scope

**In scope**

- Universal AI search with citations, confidence, freshness, and source trust ranking
- Multi-modal search: text, voice, image, video, PDF, code, academic, news, maps, shopping, travel, jobs, people, companies, healthcare, finance
- Live news, trends, content-creator mode, research mode
- Authenticated product surfaces: dashboard, history, collections, workspace, API keys, subscriptions
- Admin panel: users, RBAC, analytics, billing, moderation, security
- Clients: Responsive Web (Next.js), PWA, Electron (Windows/macOS/Linux), Android, iOS — shared NestJS backend
- Auth: OAuth (Google, GitHub, Microsoft, Apple), email, OTP, passkeys, 2FA
- Infrastructure for millions of users: caching, queues, vector search, observability, multi-region readiness

**Out of scope (v1 platform, deferred by roadmap)**

- Operating our own web crawler at Google scale (Phase 1 uses licensed APIs + selective indexing; crawler expansion is Phase 5+)
- On-device LLM inference for mobile (edge/local models evaluated later)
- White-label reseller portal (Phase 6)

### 1.3 Definitions

| Term        | Definition                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| Query       | User natural-language or structured search input                                                     |
| Intent      | Classified purpose of a query (informational, navigational, transactional, research, news, creative) |
| Citation    | Verifiable reference to a source URL/document with excerpt and metadata                              |
| Confidence  | Model + retrieval score of answer reliability (0–100)                                                |
| Trust Score | Source-level score based on domain authority, official status, history, and verification signals     |
| RAG         | Retrieval-Augmented Generation pipeline                                                              |
| Workspace   | Tenant-scoped collaboration unit (personal or team)                                                  |
| Collection  | User-curated set of saved results, notes, and sources                                                |

### 1.4 References

- Tech stack specified in PRD §6
- Architecture: `03-SYSTEM-ARCHITECTURE.md`
- Security: `09-SECURITY-PLAN.md`

---

## 2. Overall Description

### 2.1 Product Perspective

```
[Web/PWA] [Electron] [iOS] [Android]
            │
            ▼
     API Gateway (REST / GraphQL / WS)
            │
     ┌──────┴──────┐
     │  NestJS     │  Auth · Billing · Search Orchestrator
     │  Services   │  AI Agents · News · Creator · Admin
     └──────┬──────┘
            │
  PostgreSQL · Redis · BullMQ · OpenSearch · Qdrant · S3/R2
            │
  LLM Providers · Web Search APIs · News · YouTube · Academic APIs
```

### 2.2 User Classes

| Class             | Description                                 | Priority |
| ----------------- | ------------------------------------------- | -------- |
| Anonymous Visitor | Landing, limited searches                   | High     |
| Free User         | Authenticated, rate-limited search          | High     |
| Pro User          | Higher limits, research/creator modes       | High     |
| Team / Business   | Workspaces, shared collections, SSO (later) | Medium   |
| Enterprise        | Custom limits, audit, VPC/private (later)   | Medium   |
| API Developer     | Programmatic search via API keys            | High     |
| Admin             | Platform operations                         | High     |
| Moderator         | Content / abuse review                      | Medium   |

### 2.3 Operating Environment

- Cloud: AWS (primary), Cloudflare (CDN/WAF/R2), Vercel (web edge)
- Containers: Docker; orchestration: Kubernetes
- Runtimes: Node.js 22 LTS, TypeScript 5.x
- Browsers: last 2 major versions of Chrome, Firefox, Safari, Edge
- Mobile: iOS 16+, Android 12+
- Desktop Electron: Windows 10+, macOS 13+, Ubuntu 22.04+ / equivalent

### 2.4 Constraints

- Must not store raw payment card data (payment-processor tokenization)
- Must comply with GDPR/CCPA data subject rights
- Must respect robots.txt / API ToS for source providers
- Must not present AI-generated content as verified fact without citations
- Latency budget for streaming first token: p50 < 800ms (cached/warm), p95 < 2.5s for standard search

### 2.5 Assumptions

- Third-party search/news/LLM APIs remain available under commercial agreements
- Clerk or Auth.js chosen at Phase 0; default recommendation: **Clerk** for speed-to-production + passkeys, with Auth.js adapter path documented for exit strategy
- Primary vector DB: **Qdrant** (self-hostable); Pinecone optional for managed failover
- Primary lexical search: **OpenSearch** (AWS-managed)

---

## 3. Functional Requirements

### 3.1 Authentication & Identity (FR-AUTH)

| ID         | Requirement                                                      | Priority |
| ---------- | ---------------------------------------------------------------- | -------- |
| FR-AUTH-01 | Users can sign up / sign in via Google, GitHub, Microsoft, Apple | Must     |
| FR-AUTH-02 | Users can sign in via email + password or magic link             | Must     |
| FR-AUTH-03 | Users can sign in via OTP (email/SMS)                            | Must     |
| FR-AUTH-04 | Users can enroll and authenticate with passkeys (WebAuthn)       | Must     |
| FR-AUTH-05 | Users can enable TOTP 2FA                                        | Must     |
| FR-AUTH-06 | Sessions are JWT-based with refresh rotation and revocation      | Must     |
| FR-AUTH-07 | Account linking for multiple OAuth providers                     | Should   |
| FR-AUTH-08 | Device/session management UI (revoke)                            | Must     |

### 3.2 Universal Search (FR-SEARCH)

| ID           | Requirement                                                                                                                | Priority      |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------- |
| FR-SEARCH-01 | Accept natural language queries and structured filters                                                                     | Must          |
| FR-SEARCH-02 | Classify intent before retrieval                                                                                           | Must          |
| FR-SEARCH-03 | Retrieve from multiple source adapters in parallel                                                                         | Must          |
| FR-SEARCH-04 | Deduplicate near-identical content                                                                                         | Must          |
| FR-SEARCH-05 | Rank by trust, freshness, relevance, official status                                                                       | Must          |
| FR-SEARCH-06 | Detect and down-rank likely misinformation signals                                                                         | Must          |
| FR-SEARCH-07 | Stream AI summary + detailed answer with citations                                                                         | Must          |
| FR-SEARCH-08 | Show confidence score, last-updated, official links                                                                        | Must          |
| FR-SEARCH-09 | Show related images, videos, live news when relevant                                                                       | Must          |
| FR-SEARCH-10 | Suggest related questions and better query reformulations                                                                  | Must          |
| FR-SEARCH-11 | Suggest SEO keywords, blog/YouTube/viral ideas (Creator Mode)                                                              | Should        |
| FR-SEARCH-12 | Suggest business opportunities when intent matches                                                                         | Could         |
| FR-SEARCH-13 | Voice search (speech-to-text)                                                                                              | Should        |
| FR-SEARCH-14 | Image search (upload / URL reverse & visual QA)                                                                            | Should        |
| FR-SEARCH-15 | PDF / document search and summarization                                                                                    | Must          |
| FR-SEARCH-16 | Mode-specific search: Research, Academic, Code, News, Maps, Shopping, Travel, Jobs, People, Companies, Healthcare, Finance | Must (phased) |
| FR-SEARCH-17 | Filters: country, language, date range, source type, file type, quality                                                    | Must          |
| FR-SEARCH-18 | Result actions: bookmark, share, copy, export, listen (TTS), save to collection                                            | Must          |
| FR-SEARCH-19 | Translate result content                                                                                                   | Should        |
| FR-SEARCH-20 | Anonymous rate-limited search; authenticated higher quotas                                                                 | Must          |

### 3.3 Live News (FR-NEWS)

| ID         | Requirement                                                                                             | Priority |
| ---------- | ------------------------------------------------------------------------------------------------------- | -------- |
| FR-NEWS-01 | Global and country-scoped live news feeds                                                               | Must     |
| FR-NEWS-02 | Categories: Tech, Politics, Business, Sports, Entertainment, Health, Science, Crypto, AI, Cybersecurity | Must     |
| FR-NEWS-03 | Breaking news highlighting with freshness SLA                                                           | Must     |
| FR-NEWS-04 | News cards link into full Nova Search synthesis                                                         | Must     |

### 3.4 AI Assistant (FR-ASSIST)

| ID           | Requirement                                                          | Priority |
| ------------ | -------------------------------------------------------------------- | -------- |
| FR-ASSIST-01 | Chat grounded on current search result context                       | Must     |
| FR-ASSIST-02 | Actions: explain, summarize, translate, rewrite, compare, fact-check | Must     |
| FR-ASSIST-03 | Generate report / presentation outline / PDF / Excel / notes         | Should   |
| FR-ASSIST-04 | Streaming responses with citation preservation                       | Must     |

### 3.5 Content Creator Mode (FR-CREATOR)

| ID            | Requirement                                         | Priority |
| ------------- | --------------------------------------------------- | -------- |
| FR-CREATOR-01 | Toggle Creator Mode per session/workspace           | Must     |
| FR-CREATOR-02 | Trending topics, viral videos/reels signals         | Should   |
| FR-CREATOR-03 | Blog titles, scripts, hooks, thumbnail ideas        | Must     |
| FR-CREATOR-04 | SEO keywords, hashtags, posting-time heuristics     | Must     |
| FR-CREATOR-05 | Competitor and audience analysis (public data only) | Should   |

### 3.6 Research Mode (FR-RESEARCH)

| ID             | Requirement                                                         | Priority |
| -------------- | ------------------------------------------------------------------- | -------- |
| FR-RESEARCH-01 | Prioritize academic, government, medical, legal, scientific sources | Must     |
| FR-RESEARCH-02 | Company/financial reports when applicable                           | Should   |
| FR-RESEARCH-03 | Citation export: BibTeX, APA, MLA                                   | Must     |
| FR-RESEARCH-04 | Structured literature-style summary with primary sources first      | Must     |

### 3.7 User Library & Workspace (FR-LIB)

| ID        | Requirement                                       | Priority |
| --------- | ------------------------------------------------- | -------- |
| FR-LIB-01 | Search history with privacy controls              | Must     |
| FR-LIB-02 | Saved searches, bookmarks, notes, collections     | Must     |
| FR-LIB-03 | Workspace for team sharing (Pro+)                 | Should   |
| FR-LIB-04 | Notifications for saved queries / breaking topics | Should   |

### 3.8 Billing & API (FR-BILL)

| ID         | Requirement                                         | Priority |
| ---------- | --------------------------------------------------- | -------- |
| FR-BILL-01 | Free / Pro / Business subscription tiers            | Must     |
| FR-BILL-02 | Lemon Squeezy checkout + customer portal            | Must     |
| FR-BILL-03 | API keys with scoped permissions and usage metering | Must     |
| FR-BILL-04 | Soft and hard rate limits per plan                  | Must     |

### 3.9 Settings & Privacy (FR-SET)

| ID        | Requirement                                        | Priority |
| --------- | -------------------------------------------------- | -------- |
| FR-SET-01 | Theme, language, region, safe search, adult filter | Must     |
| FR-SET-02 | Accessibility preferences                          | Must     |
| FR-SET-03 | Data export (GDPR)                                 | Must     |
| FR-SET-04 | Delete account and cascade personal data           | Must     |

### 3.10 Admin (FR-ADMIN)

| ID          | Requirement                                      | Priority |
| ----------- | ------------------------------------------------ | -------- |
| FR-ADMIN-01 | User, role, permission management (RBAC)         | Must     |
| FR-ADMIN-02 | Analytics: searches, latency, cost, conversion   | Must     |
| FR-ADMIN-03 | Subscriptions, payments, API usage               | Must     |
| FR-ADMIN-04 | Audit logs, security dashboard, moderation queue | Must     |

### 3.11 Clients (FR-CLIENT)

| ID           | Requirement                                                                               | Priority |
| ------------ | ----------------------------------------------------------------------------------------- | -------- |
| FR-CLIENT-01 | Responsive web + PWA offline shell for history/bookmarks                                  | Must     |
| FR-CLIENT-02 | Electron apps for Windows, macOS, Linux                                                   | Should   |
| FR-CLIENT-03 | Native Android and iOS (shared API; React Native or Capacitor — decision in Architecture) | Should   |

---

## 4. Non-Functional Requirements

### 4.1 Performance (NFR-PERF)

| ID          | Metric                                    | Target                            |
| ----------- | ----------------------------------------- | --------------------------------- |
| NFR-PERF-01 | Time to first streamed token (search)     | p50 ≤ 800ms, p95 ≤ 2.5s           |
| NFR-PERF-02 | Full answer completion (standard)         | p95 ≤ 12s                         |
| NFR-PERF-03 | API p95 latency (non-AI endpoints)        | ≤ 200ms                           |
| NFR-PERF-04 | Web LCP (landing)                         | ≤ 2.5s on mid-tier broadband      |
| NFR-PERF-05 | Concurrent search capacity (initial prod) | 5k RPS design headroom; autoscale |

### 4.2 Scalability (NFR-SCALE)

- Stateless API pods; horizontal scale
- Queue-backed fan-out for multi-source retrieval
- Redis for session cache, rate limits, hot query cache
- Partition strategy for history tables by user/time

### 4.3 Availability (NFR-AVAIL)

- Target SLO: 99.9% monthly for core search API
- Multi-AZ deployment; multi-region active-passive initially
- Graceful degradation: if one LLM or source adapter fails, continue with remaining

### 4.4 Security (NFR-SEC)

- See Security Plan; OWASP Top 10 controls mandatory
- Encryption in transit (TLS 1.2+) and at rest (AES-256)
- Secrets in vault; least-privilege IAM

### 4.5 Accessibility (NFR-A11Y)

- WCAG 2.2 AA for web surfaces
- Keyboard-first navigation; screen reader labels; focus management
- Respect `prefers-reduced-motion`

### 4.6 Internationalization (NFR-I18N)

- UI strings externalized; initial locales: en, es, fr, de, hi, ja, pt-BR
- Query language auto-detect; results filterable by language

### 4.7 Maintainability (NFR-MAINT)

- Feature modules with clear bounded contexts
- OpenAPI + GraphQL schema as contracts
- Mandatory tests for domain logic; CI quality gates

### 4.8 Observability (NFR-OBS)

- OpenTelemetry traces/metrics/logs
- Prometheus + Grafana dashboards
- Per-request cost attribution (tokens + external API)

---

## 5. Data Requirements

- Persist: users, workspaces, subscriptions, searches, citations metadata, collections, API keys, audit logs
- Cache: hot queries, trending, rate-limit counters, session fragments
- Vectors: embeddings for semantic retrieval of indexed docs and conversation memory
- Object storage: uploads (images/PDFs), exports, generated files
- Retention: history configurable; deleted accounts purged per policy (default 30-day soft delete)

---

## 6. External Interface Requirements

### 6.1 User Interfaces

Landing, Auth, Dashboard, Search Results, News, Creator, Research, Settings, Billing, Admin — detailed in UI/UX Plan.

### 6.2 Software Interfaces

| System                                                 | Purpose                 |
| ------------------------------------------------------ | ----------------------- |
| OpenAI / Anthropic / Google / DeepSeek / open models   | Generation & embeddings |
| Web search providers (SerpAPI / Bing / Brave / custom) | Live web retrieval      |
| News APIs                                              | Live news               |
| YouTube Data API                                       | Video results           |
| Academic (Semantic Scholar, Crossref, OpenAlex)        | Papers                  |
| GitHub API                                             | Code/repos              |
| Lemon Squeezy                                          | Billing                 |
| Clerk / Auth.js                                        | Identity                |
| S3 / R2                                                | Objects                 |
| OpenSearch / Qdrant                                    | Lexical + vector search |
| Email/SMS providers                                    | OTP, notifications      |

### 6.3 Communication Interfaces

- HTTPS REST `/v1`
- GraphQL `/graphql` (read-heavy dashboards)
- WebSocket `/ws` (streaming, notifications)
- Server-Sent Events optional for search stream on web

---

## 7. Quality Attributes Matrix

| Attribute | Approach                                                 |
| --------- | -------------------------------------------------------- |
| Accuracy  | Multi-source RAG, trust ranking, fact-check agent        |
| Trust     | Citations mandatory on factual claims                    |
| Freshness | Time-decay ranking + live news adapters                  |
| Cost      | Model routing by complexity; cache; batch embeddings     |
| Privacy   | Minimize PII in logs; optional private mode (no history) |

---

## 8. Requirements Traceability

Each FR maps to: Domain module → API endpoint(s) → DB entities → Test cases → Roadmap phase.  
Traceability matrix maintained in `08-DEVELOPMENT-ROADMAP.md` and CI docs after Phase 0.

---

## 9. Approval

| Role                | Name | Date | Signature |
| ------------------- | ---- | ---- | --------- |
| Product Owner       |      |      |           |
| Principal Architect |      |      |           |
| Security Lead       |      |      |           |
| Engineering Lead    |      |      |           |
