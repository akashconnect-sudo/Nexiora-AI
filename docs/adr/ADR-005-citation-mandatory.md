# ADR-005: Citation-mandatory generation

**Status:** Accepted  
**Date:** 2026-07-11

## Context

Hallucinations destroy trust for an AI Knowledge Platform.

## Decision

Factual claims in Nova Search answers **must** be citation-grounded. Low-confidence answers must abstain or mark uncertainty. Verification runs as a first-class pipeline stage.

## Consequences

- Prompt and schema design enforce citation markers
- Eval harness gates model/prompt changes
