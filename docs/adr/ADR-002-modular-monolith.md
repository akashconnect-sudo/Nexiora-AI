# ADR-002: Modular NestJS monolith

**Status:** Accepted  
**Date:** 2026-07-11

## Context

Microservices add operational cost before product-market fit.

## Decision

Ship a **modular NestJS monolith** with Clean Architecture folders per bounded context. Extract services only when scale or team boundaries demand it.

## Consequences

- Faster Phase 0–3 delivery
- Clear module seams for future extraction (search worker, billing)
