# ADR-0046 — Mission CC Mission Economics & Portfolio Budget Governor Port

- **Status:** Accepted — local governed (Ladder 24 Satellite 2)
- **Date:** 2026-09-18
- **Deciders:** EOS local governed use (Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric)
- **Spec:** SPEC-0086

## Context

Local token/cost circuit breakers exist (`token-economics-audit-engine.js` and related surfaces).
EOS lacked a Layer-0 portfolio governor for multi-mission envelopes (latency / cost / risk budgets) with sealed receipts.

Mission CC delivers a pure Layer-0 Mission Portfolio Budget Governor Port that:
1. Accepts envelope plans with budgets + per-mission allocations.
2. Validates plans fail-closed (empty, invalid envelope, unknown mission ids, max allocations, Law VI secrets, Fundacion).
3. Sums allocation dimensions and decides ALLOW | THROTTLE | DENY vs budgets.
4. Emits sealed `CC-RCPT-*` receipts with nine-field SHA-256 custody and digest chaining.
5. Verifies hash-chained custody via `verifyTrail()`.
6. Does not call cloud billing APIs; does not claim FinOps SaaS.

Existing `token-economics-audit-engine.js` remains untouched — CC is a NEW hermetic companion under `src/core/economics/`.

## Decision

1. Implement three Layer-0 modules under `src/core/economics/`:
   - `mission-portfolio-budget-receipt.js`: Canonical nine-field SHA-256 sealed receipts (`CC-RCPT-*`) via `node:crypto`.
   - `mission-portfolio-budget-policy-gate.js`: Fail-closed envelope/allocation validation.
   - `mission-portfolio-budget-port.js`: Unified port facade (`evaluate`, `verifyTrail`, `getPortfolio`).
2. Hard over-budget → DENY; soft utilization ≥ `CC_THROTTLE_RATIO` (0.85) under hard caps → THROTTLE; else ALLOW.
3. Exclude satellite test suite `tests/eos-cc-mission-portfolio-budget-port.test.js` from default slim discovery; opt-in via `npm run test:mission-cc` / `test:mission-portfolio-budget`.
4. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, ≠ FinOps SaaS / ≠ cloud billing.

## Alternatives considered AND REJECTED

### A. FinOps SaaS / cloud billing integrator embedding
**Rejected.** EOS does not claim cloud cost management platforms or vendor billing APIs.
Technical reason: Local Layer-0 hermetic envelope math with sealed digests is sufficient without network billing deps.

### B. Mutating / replacing token-economics-audit-engine
**Rejected.** Existing local circuit breakers stay; CC adds portfolio governor as a new port.

### C. Tip-refresh / freeze tip rewrite inside this mission
**Rejected.** Freeze/matrix tip pin stays on Mission CB tip until a SEPARATE tip-refresh after CC merges.

## Consequences

- **Positive:** Multi-mission envelope budgets with chained CC receipts; ≥14 hermetic tests; zero secrets; Fundacion Δ=0; economics surface extended without breaking token engine.
- **Negative:** Soft THROTTLE is a local utilization heuristic — not a cloud autoscaler.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI held; L17–L23 never reopen.

## NON-CLAIMS

- Mission economics portfolio ≠ FinOps SaaS
- Mission economics portfolio ≠ cloud billing integrator
- PRODUCTION_READY=NO (never flip in this mission)
- ≠ Fundacion writes; ≠ tip-refresh; ≠ Missions CD–CF
