# ADR-003: Clerk behind Identity port

**Status:** Accepted  
**Date:** 2026-07-11

## Context

Need OAuth, email, OTP, passkeys quickly without locking domain code to one vendor.

## Decision

Use **Clerk** as the first `IdentityProviderPort` adapter. Domain use cases depend only on the port.

## Consequences

- Fast auth for Phase 1
- Exit path: implement Auth.js / custom adapter without rewriting use cases
