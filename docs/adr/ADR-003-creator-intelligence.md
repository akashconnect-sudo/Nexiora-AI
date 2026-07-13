# ADR-003: Creator Intelligence as a bounded context

**Status:** Accepted  
**Date:** 2026-07-11

## Context

Nexiora needs a YouTube Creator Intelligence module (Creator DNA, trend scoring, opportunity scores, AI coach) without claiming mind-reading. It must stay API-first and extractable from the modular monolith.

## Decision

Ship **Creator Intelligence** as its own NestJS module (`modules/creator`) with:

- Explicit **permission grants** before any YouTube / Google / history access
- **Prediction vs verified** labels on every recommendation
- Hybrid persistence (Prisma when healthy, in-memory for local/dev)
- Shared Zod contracts in `@nexiora/shared`
- Web surface under `/creator/*` with product app shell

YouTube Data API and Google OAuth are **opt-in adapters**; until keys exist, public signals (news, HN, trends heuristics) power recommendations and are labeled accordingly.

## Consequences

- Clear seam for a future `creator-worker` extraction
- No fake private channel metrics without consent + API connection
- Faster MVP while preserving enterprise SaaS shape
