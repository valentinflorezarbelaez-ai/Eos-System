# ADR-0013 — Phase 4 Write Barrier Sandbox

- **Status:** Accepted (local governed)
- **Date:** 2026-09-08
- **Deciders:** EOS Control Plane

## Context

Prior write barriers were denylist checks (`barrierCheck`, `governance-gate` hardcoded absolute paths, guardrail Fundacion blocks) without process-scoped allowlists. Mission/MCP Phase 5 needs a clear seam: mutations must be opt-in via scope.

## Decision

Introduce `src/core/write-barrier/` with:

1. AsyncLocalStorage `withWriteScope`
2. SSOT JSON allowlist resolved via realpath
3. Fail-closed authorize API + optional `fs` hooks
4. Fundacion always denied
5. `governance-gate` and `barrierCheck` consume the shared module (no parallel unsafe path)

## Consequences

- In-process writers must open a scope (or use `checkWritePathPolicy` only for IDE advisory gates)
- Misconfigured/missing SSOT → deny
- Hardcoded user-home paths removed from `governance-gate.js`
