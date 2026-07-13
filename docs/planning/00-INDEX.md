# Nexiora AI — Planning Package Index

**Status:** APPROVED — Phase 0 (Foundation) in progress  
**Version:** 1.0.0  
**Approved:** 2026-07-11  
**Product:** Nexiora AI (platform) · Nova Search (AI Knowledge Search engine)  
**Defaults locked:** Clerk · Expo · Qdrant · OpenSearch · modular monolith · dual brand

---

## Branding Decision (Requires Approval)

| Layer | Name | Role |
|-------|------|------|
| Company / Platform | **Nexiora AI** | SaaS brand, billing, identity, workspaces |
| Core Product | **Nova Search** | AI-powered knowledge search engine |
| Legal entity (TBD) | Nexiora Inc. (placeholder) | Corporate |

> If you prefer a single public name, approve either **Nexiora AI** or **Nova Search AI** as the sole brand. Default assumption below: dual naming as above.

---

## Document Set

| # | Document | Path | Purpose |
|---|----------|------|---------|
| 1 | Software Requirements Specification (SRS) | [01-SRS.md](./01-SRS.md) | Functional & non-functional requirements |
| 2 | Product Requirements Document (PRD) | [02-PRD.md](./02-PRD.md) | Product vision, personas, features, success metrics |
| 3 | System Architecture | [03-SYSTEM-ARCHITECTURE.md](./03-SYSTEM-ARCHITECTURE.md) | Clean Architecture, DDD, services, data flow |
| 4 | Database Schema | [04-DATABASE-SCHEMA.md](./04-DATABASE-SCHEMA.md) | PostgreSQL, Redis, OpenSearch, Qdrant models |
| 5 | API Design | [05-API-DESIGN.md](./05-API-DESIGN.md) | REST, GraphQL, WebSocket, versioning |
| 6 | Folder Structure | [06-FOLDER-STRUCTURE.md](./06-FOLDER-STRUCTURE.md) | Monorepo, feature-based layout |
| 7 | UI/UX Plan | [07-UI-UX-PLAN.md](./07-UI-UX-PLAN.md) | Design system, flows, accessibility |
| 8 | Development Roadmap | [08-DEVELOPMENT-ROADMAP.md](./08-DEVELOPMENT-ROADMAP.md) | Phased delivery, module order |
| 9 | Security Plan | [09-SECURITY-PLAN.md](./09-SECURITY-PLAN.md) | AuthN/Z, OWASP, compliance |
| 10 | DevOps Plan | [10-DEVOPS-PLAN.md](./10-DEVOPS-PLAN.md) | CI/CD, observability, environments |
| 11 | Testing Strategy | [11-TESTING-STRATEGY.md](./11-TESTING-STRATEGY.md) | Unit, integration, E2E, AI eval |
| 12 | Deployment Strategy | [12-DEPLOYMENT-STRATEGY.md](./12-DEPLOYMENT-STRATEGY.md) | K8s, multi-region, rollback |

---

## Approval Checklist

- [x] Branding (Nexiora AI + Nova Search)
- [x] SRS (scope, platforms, NFRs)
- [x] PRD (MVP vs later phases)
- [x] System Architecture (services & AI pipeline)
- [x] Database Schema
- [x] API Design (REST primary, GraphQL secondary)
- [x] Folder Structure (Turborepo monorepo)
- [x] UI/UX Plan
- [x] Roadmap (Phase 0 → Phase 6)
- [x] Security Plan
- [x] DevOps / Testing / Deployment

**Approved:** 2026-07-11 — Phase 0 Foundation implementing / complete pending Docker verify.

---

## Non-Negotiable Engineering Rules (Locked)

1. No demo, placeholder, or stub implementations in mergeable code.
2. Clean Architecture + DDD + SOLID + feature-based modules.
3. One module fully tested, documented, and production-ready before the next.
4. Shared backend for Web, PWA, Electron (Windows/macOS/Linux), Android, iOS.
5. Prefer facts, official sources, citations, confidence, and freshness in every answer.
6. Secrets never in git; all config via environment / secrets manager.
