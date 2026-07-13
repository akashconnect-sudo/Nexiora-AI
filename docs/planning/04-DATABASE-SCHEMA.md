# Database Schema

**Product:** Nexiora AI / Nova Search  
**Document:** DB-1.0  
**Status:** Draft — Awaiting Approval  
**Primary store:** PostgreSQL 16 via Prisma  
**Secondary:** Redis, OpenSearch, Qdrant, object storage

---

## 1. Design Principles

1. PostgreSQL is the system of record for users, entitlements, search sessions, billing, audit.
2. Large retrieval corpora live in OpenSearch (lexical) + Qdrant (vectors); Postgres stores pointers/metadata.
3. Soft deletes for user content; hard delete after retention for GDPR erase.
4. UUID primary keys (`uuid(7)` preferred when available; else `uuid(4)`).
5. All tables: `created_at`, `updated_at`; mutable user content: `deleted_at`.
6. Multi-tenant via `workspace_id` where applicable; personal workspace auto-created per user.

---

## 2. ER Overview (Core)

```
User 1──* WorkspaceMember *──1 Workspace
User 1──* SearchSession 1──1 Answer 1──* Citation
User 1──* Collection 1──* CollectionItem
User 1──* ApiKey 1──* UsageRecord
User 1──1 Subscription
User 1──* AuditLog
SourceTrust 1──* Citation (by domain)
```

---

## 3. PostgreSQL Tables

### 3.1 Identity

```prisma
model User {
  id              String    @id @db.Uuid
  clerkId         String?   @unique // or authProviderSubject
  email           String    @unique
  emailVerifiedAt DateTime?
  displayName     String?
  avatarUrl       String?
  locale          String    @default("en")
  region          String?
  theme           String    @default("system") // light|dark|system
  safeSearch      String    @default("moderate") // off|moderate|strict
  adultFilter     Boolean   @default(true)
  role            GlobalRole @default(USER)
  status          UserStatus @default(ACTIVE)
  lastLoginAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?

  workspaces      WorkspaceMember[]
  sessions        SearchSession[]
  collections     Collection[]
  bookmarks       Bookmark[]
  notes           Note[]
  apiKeys         ApiKey[]
  subscription    Subscription?
  notifications   Notification[]
  auditLogs       AuditLog[]
}

enum GlobalRole { USER ADMIN MODERATOR SUPPORT }
enum UserStatus { ACTIVE SUSPENDED BANNED PENDING_DELETION }
```

```prisma
model UserAuthFactor {
  id        String   @id @db.Uuid
  userId    String   @db.Uuid
  type      String   // totp|passkey|oauth_google|...
  metadata  Json     // non-secret metadata only
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```

### 3.2 Tenancy

```prisma
model Workspace {
  id          String   @id @db.Uuid
  name        String
  slug        String   @unique
  type        WorkspaceType @default(PERSONAL)
  ownerId     String   @db.Uuid
  settings    Json     @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  members     WorkspaceMember[]
  collections Collection[]
}

enum WorkspaceType { PERSONAL TEAM ORGANIZATION }

model WorkspaceMember {
  id          String   @id @db.Uuid
  workspaceId String   @db.Uuid
  userId      String   @db.Uuid
  role        WorkspaceRole @default(MEMBER)
  createdAt   DateTime @default(now())
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  user        User      @relation(fields: [userId], references: [id])

  @@unique([workspaceId, userId])
}

enum WorkspaceRole { OWNER ADMIN MEMBER VIEWER }
```

### 3.3 Search

```prisma
model SearchSession {
  id            String   @id @db.Uuid
  userId        String?  @db.Uuid
  workspaceId   String?  @db.Uuid
  query         String
  normalizedQuery String
  intent        String?  // informational|news|research|...
  mode          SearchMode @default(UNIVERSAL)
  filters       Json     @default("{}")
  status        SearchStatus @default(PENDING)
  isPrivate     Boolean  @default(false)
  client        String?  // web|ios|android|electron|api
  ipHash        String?  // keyed hash, not raw IP
  userAgent     String?
  latencyMs     Int?
  costMicros    BigInt?  // USD micros
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?

  user          User?    @relation(fields: [userId], references: [id])
  answer        Answer?
  events        SearchEvent[]

  @@index([userId, createdAt(sort: Desc)])
  @@index([normalizedQuery, createdAt(sort: Desc)])
}

enum SearchMode {
  UNIVERSAL RESEARCH NEWS CODE ACADEMIC CREATOR
  SHOPPING TRAVEL JOBS MAPS PEOPLE COMPANIES HEALTHCARE FINANCE
}

enum SearchStatus { PENDING RETRIEVING GENERATING COMPLETED FAILED PARTIAL }

model Answer {
  id              String   @id @db.Uuid
  searchSessionId String   @unique @db.Uuid
  summary         String   @db.Text
  detailedMarkdown String  @db.Text
  confidence      Decimal  @db.Decimal(5, 2)
  model           String
  language        String   @default("en")
  verificationStatus String @default("unverified") // verified|partial|failed|unverified
  finishedAt      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  session         SearchSession @relation(fields: [searchSessionId], references: [id])
  citations       Citation[]
}

model Citation {
  id          String   @id @db.Uuid
  answerId    String   @db.Uuid
  ordinal     Int
  title       String
  url         String
  canonicalUrl String
  snippet     String   @db.Text
  domain      String
  sourceType  SourceType
  isOfficial  Boolean  @default(false)
  trustScore  Decimal  @db.Decimal(5, 2)
  confidence  Decimal  @db.Decimal(5, 2)
  publishedAt DateTime?
  retrievedAt DateTime @default(now())
  author      String?
  language    String?
  faviconUrl  String?
  metadata    Json     @default("{}")

  answer      Answer   @relation(fields: [answerId], references: [id])

  @@index([domain])
  @@index([answerId, ordinal])
}

enum SourceType {
  WEB NEWS ACADEMIC GOVERNMENT DOCS GITHUB YOUTUBE BLOG
  SOCIAL REDDIT HN PDF IMAGE VIDEO OTHER
}

model SearchEvent {
  id        String   @id @db.Uuid
  searchId  String   @db.Uuid
  type      String   // token|citation|enrichment|error
  payload   Json
  createdAt DateTime @default(now())
  session   SearchSession @relation(fields: [searchId], references: [id])

  @@index([searchId, createdAt])
}
```

### 3.4 Library

```prisma
model Collection {
  id          String   @id @db.Uuid
  userId      String   @db.Uuid
  workspaceId String?  @db.Uuid
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  items       CollectionItem[]
}

model CollectionItem {
  id           String   @id @db.Uuid
  collectionId String   @db.Uuid
  searchId     String?  @db.Uuid
  citationId   String?  @db.Uuid
  noteId       String?  @db.Uuid
  position     Int      @default(0)
  createdAt    DateTime @default(now())
}

model Bookmark {
  id        String   @id @db.Uuid
  userId    String   @db.Uuid
  url       String
  title     String
  searchId  String?  @db.Uuid
  createdAt DateTime @default(now())
  deletedAt DateTime?

  @@index([userId, createdAt(sort: Desc)])
}

model Note {
  id        String   @id @db.Uuid
  userId    String   @db.Uuid
  searchId  String?  @db.Uuid
  title     String?
  body      String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
}

model SavedSearch {
  id        String   @id @db.Uuid
  userId    String   @db.Uuid
  query     String
  filters   Json     @default("{}")
  mode      SearchMode @default(UNIVERSAL)
  notify    Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

### 3.5 News & Trends (metadata; bodies may be cached externally)

```prisma
model NewsItem {
  id          String   @id @db.Uuid
  externalId  String   @unique
  title       String
  url         String
  source      String
  category    String
  country     String?
  publishedAt DateTime
  summary     String?  @db.Text
  imageUrl    String?
  trustScore  Decimal? @db.Decimal(5, 2)
  createdAt   DateTime @default(now())

  @@index([category, publishedAt(sort: Desc)])
  @@index([country, publishedAt(sort: Desc)])
}

model TrendSignal {
  id        String   @id @db.Uuid
  topic     String
  score     Decimal  @db.Decimal(10, 2)
  region    String?
  source    String
  capturedAt DateTime @default(now())

  @@index([region, capturedAt(sort: Desc)])
}
```

### 3.6 Trust Registry

```prisma
model SourceTrust {
  domain        String   @id
  displayName   String?
  isOfficial    Boolean  @default(false)
  category      String?
  baseTrust     Decimal  @db.Decimal(5, 2)
  flags         String[] @default([])
  updatedAt     DateTime @updatedAt
}
```

### 3.7 Billing & API

```prisma
model Plan {
  id            String   @id // free|pro|business|enterprise
  name          String
  monthlyPriceCents Int
  entitlements  Json     // quotas, feature flags
  stripePriceId String?
}

model Subscription {
  id               String   @id @db.Uuid
  userId           String   @unique @db.Uuid
  planId           String
  status           String   // active|past_due|canceled|trialing
  stripeCustomerId String?  @unique
  stripeSubId      String?  @unique
  currentPeriodEnd DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

model ApiKey {
  id         String   @id @db.Uuid
  userId     String   @db.Uuid
  name       String
  keyPrefix  String
  keyHash    String   // argon2/bcrypt of secret
  scopes     String[]
  lastUsedAt DateTime?
  expiresAt  DateTime?
  revokedAt  DateTime?
  createdAt  DateTime @default(now())

  @@index([keyPrefix])
}

model UsageRecord {
  id         String   @id @db.Uuid
  userId     String   @db.Uuid
  apiKeyId   String?  @db.Uuid
  metric     String   // search|token_in|token_out
  quantity   Int
  costMicros BigInt   @default(0)
  day        DateTime @db.Date
  createdAt  DateTime @default(now())

  @@index([userId, day])
  @@index([apiKeyId, day])
}
```

### 3.8 Admin / Security

```prisma
model AuditLog {
  id         String   @id @db.Uuid
  actorId    String?  @db.Uuid
  action     String
  resource   String
  resourceId String?
  ipHash     String?
  metadata   Json     @default("{}")
  createdAt  DateTime @default(now())

  @@index([createdAt(sort: Desc)])
  @@index([actorId, createdAt(sort: Desc)])
}

model ModerationCase {
  id        String   @id @db.Uuid
  type      String
  status    String   // open|resolved|rejected
  payload   Json
  openedBy  String?
  resolvedBy String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Notification {
  id        String   @id @db.Uuid
  userId    String   @db.Uuid
  type      String
  title     String
  body      String
  readAt    DateTime?
  payload   Json     @default("{}")
  createdAt DateTime @default(now())

  @@index([userId, createdAt(sort: Desc)])
}
```

---

## 4. Redis Keys

| Key pattern | TTL | Purpose |
|-------------|-----|---------|
| `rl:user:{id}:{minute}` | 2m | Rate limit |
| `rl:ip:{hash}:{minute}` | 2m | Anon rate limit |
| `cache:search:{hash}` | 5m–24h | Hot answer cache |
| `trend:global` | 15m | Trending payload |
| `session:ws:{id}` | 1h | WS search stream state |
| `entitlement:{userId}` | 5m | Plan entitlements cache |
| `lock:search:{id}` | 30s | Idempotency |

---

## 5. OpenSearch Indices

### `documents_v1`

```json
{
  "mappings": {
    "properties": {
      "url": { "type": "keyword" },
      "canonical_url": { "type": "keyword" },
      "title": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
      "body": { "type": "text" },
      "domain": { "type": "keyword" },
      "source_type": { "type": "keyword" },
      "language": { "type": "keyword" },
      "country": { "type": "keyword" },
      "is_official": { "type": "boolean" },
      "trust_score": { "type": "float" },
      "published_at": { "type": "date" },
      "retrieved_at": { "type": "date" }
    }
  }
}
```

### `news_v1` — parallel mapping optimized for freshness sorts.

---

## 6. Qdrant Collections

### `doc_embeddings`

- Vector: 1536 or 3072 dims (embedding model ADR)
- Payload: `url`, `domain`, `source_type`, `published_at`, `trust_score`, `language`
- Filters mirror search filters

### `memory_embeddings` (Pro+)

- Per-user conversation/memory chunks with strict ACL payload `user_id`

---

## 7. Object Storage Layout

```
s3://nexiora-prod/
  uploads/{userId}/{uuid}
  exports/{userId}/{uuid}.pdf
  avatars/{userId}
  generated/{searchId}/...
```

---

## 8. Migrations & Seeding

- Prisma migrate in CI; expand/contract for zero-downtime
- Seed: plans, source trust for high-authority domains (gov, standards bodies, major docs)

---

## 9. Approval

Schema freeze for Phase 1 tables required before first migration lands on main.
