# ADR-004: Qdrant + OpenSearch

**Status:** Accepted  
**Date:** 2026-07-11

## Context

Need lexical filters and vector semantic retrieval.

## Decision

**OpenSearch** for lexical/full-text + filters; **Qdrant** as primary vector store (self-hostable). Pinecone remains an optional managed failover later.

## Consequences

- Docker Compose parity for local dev
- Operational ownership of Qdrant in production
