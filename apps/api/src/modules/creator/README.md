# Creator Intelligence module

Bounded context for YouTube Creator Intelligence (see `docs/planning/16-CREATOR-INTELLIGENCE.md`).

## Layout

- `domain/` — pure scoring + recommendation builders (no Nest)
- `application/` — `CreatorService` (hybrid memory + Prisma)
- `presentation/` — REST `/v1/creator/*`

## Auth

All routes require Bearer token (`AuthGuard`).

## Permissions

`PATCH /v1/creator/permissions` — never assume YouTube/Google access.

## Predictions

Responses include `kind`: `prediction` | `signal` | `verified` plus a disclaimer string.
