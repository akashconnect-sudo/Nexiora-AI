# ADR-001: Turborepo monorepo

**Status:** Accepted  
**Date:** 2026-07-11

## Context

Nexiora AI needs shared types, a design system, a NestJS API, workers, web, and later desktop/mobile clients.

## Decision

Use **Turborepo + pnpm workspaces** with `apps/*` and `packages/*`.

## Consequences

- Single CI pipeline and consistent TypeScript versions
- Shared packages (`@nexiora/shared`, `@nexiora/search-core`, `@nexiora/ui`) prevent duplication
- Requires discipline on package boundaries
