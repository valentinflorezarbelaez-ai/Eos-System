# ADR-0127 — Mission EL Resource Isolation / Bulkhead Boundary Port

- **Status:** Accepted — local governed (Ladder 36 / Mission EL)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric)
- **Spec:** SPEC-0148
- **Prior ADRs:** ADR-0126 (Mission EK Backpressure Load-Shed), ADR-0125 (Mission EJ Admission Control Intake), ADR-0124 (Ladder 36 Maturity Gap Audit)

## Context

Ladder 36 is **OPEN** (Audit + tip-open #489 + tip-refresh #490 + EJ MEASURED #491 + tip-refresh #492 + EK MEASURED #493 + tip-refresh #494; freeze soft-observe pin `72697dd5`). Formal L30–L35 remain **CLOSED** — **NEVER reopen**. Mission EJ seals admission / work-intake quotas (`EJ-RCPT-*`) oriented on `maxConcurrent` / `maxQueueDepth`. Mission EK seals downstream backpressure / load-shed (`EK-RCPT-*`) oriented on `pressureThreshold` / `observedPressure`. Mission DX seals circuit-breaker trip/fallback. There is **no** Layer-0 bulkhead / resource-isolation boundary under `src/core/composition/` so failure or overload in one pool cannot cascade into another.

This ADR accepts Mission EL as the third L36 satellite: a hermetic Resource Isolation / Bulkhead Boundary Port that seals `EL-RCPT-*` receipts with PASS / ISOLATE / DENY. Tip-refresh post-EL is **SEPARATE** and must not land in this package.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `resource-isolation-bulkhead-receipt.js` — sealed `EL-RCPT-*` + freeze soft-observe `72697dd5` + `bulkheadHold`
   - `resource-isolation-bulkhead-policy-gate.js` — fail-closed govern preconditions
   - `resource-isolation-bulkhead-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `RESOURCE_ISOLATION_BULKHEAD_BOUNDARY`.
3. Bulkhead requires `bulkheadId` + `poolId`; optional `capacity`; hermetic injected `observedOccupancy` / `crossBulkheadTouch`.
4. Fail-closed `ISOLATE` + code `CROSS_BULKHEAD_BREACH` or `OCCUPANCY_EXCEEDED` when hermetic isolation violated. Distinct from EJ quota DENY, EK pressure SHED, and DX trip-on-failure.
5. Refuse live threads, real process isolation, wall-clock authority, tip-refresh, PRODUCTION_READY flip, L30–L35 reopen, L36 auto-close, schema-json add, Fundacion writes, GHE, secrets, mass prune.
6. Soft-observe freeze pinShort `72697dd5` only — do **not** rewrite freeze/matrix/m4 tip.
7. Hermetic tests EL1–EL17; patcher `scripts/patch-mission-el.mjs`; OpenSpec `eos-ladder-36-mission-el`.

## Alternatives Considered AND REJECTED

- Extending EJ admission quotas with bulkhead/isolation fields — REJECTED: EJ is intake-capacity oriented; mixing bulkhead isolation with admit/DENY muddies the L36 admission boundary.
- Extending EK load-shed with bulkhead fields — REJECTED: EK is downstream pressure/shed oriented; mixing isolation boundaries with shed muddies the pressure axis.
- Extending DX circuit breaker with bulkhead fields — REJECTED: DX is failure-threshold oriented.
- Live threads / real process isolation / Date.now as occupancy authority — REJECTED: hermetic injected occupancy / cross-bulkhead touch only.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-EL is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L35 or auto-closing L36 — REJECTED (EM–EN pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.

## Consequences

- Positive: Third L36 satellite seals fail-closed bulkhead/isolation with verifiable `EL-RCPT-*` receipts; EM–EN can compose on this surface.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L35 CLOSED, L36 OPEN (EJ+EK MEASURED; EL this; EM–EN pending), freeze pin `72697dd5` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS/ISOLATE ≠ tip-refresh ≠ PRODUCTION_READY ≠ EJ quota ≠ EK shed ≠ DX trip ≠ live threads ≠ real process isolation.

## Links

- Audit: `docs/releases/EOS_MATURITY_LADDER_36_AUDIT_2026-09-25.md`
- Prior: ADR-0126 (Mission EK), ADR-0125 (Mission EJ), ADR-0124 (L36 Audit)
- OpenSpec: `openspec/changes/eos-ladder-36-mission-el/`
