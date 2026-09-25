# ADR-0126 — Mission EK Backpressure & Load-Shed Governance Port

- **Status:** Accepted — local governed (Ladder 36 / Mission EK)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric)
- **Spec:** SPEC-0147
- **Prior ADRs:** ADR-0125 (Mission EJ Admission Control Intake), ADR-0124 (Ladder 36 Maturity Gap Audit)

## Context

Ladder 36 is **OPEN** (Audit + tip-open #489 + tip-refresh #490 + EJ MEASURED #491 + tip-refresh #492; freeze soft-observe pin `5e5af281`). Formal L30–L35 remain **CLOSED** — **NEVER reopen**. Mission EJ seals admission / work-intake quotas (`EJ-RCPT-*`) oriented on `maxConcurrent` / `maxQueueDepth` with fail-closed DENY when observed load exceeds quota. Mission DX seals circuit-breaker trip/fallback (`DX-RCPT-*`) oriented on `failureThreshold` / `cooldownMs`. There is **no** Layer-0 downstream backpressure / load-shed surface under `src/core/composition/` for when **admitted** work still overwhelms capacity.

This ADR accepts Mission EK as the second L36 satellite: a hermetic Backpressure & Load-Shed Governance Port that seals `EK-RCPT-*` receipts with PASS / SHED / DENY. Tip-refresh post-EK is **SEPARATE** and must not land in this package.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `backpressure-load-shed-receipt.js` — sealed `EK-RCPT-*` + freeze soft-observe `5e5af281` + `loadShedHold`
   - `backpressure-load-shed-policy-gate.js` — fail-closed govern preconditions
   - `backpressure-load-shed-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `BACKPRESSURE_LOAD_SHED_GOVERNANCE`.
3. Load requires `loadId` + `resourceClass`; optional `pressureThreshold`; hermetic injected `observedPressure`.
4. Fail-closed `SHED` + code `PRESSURE_EXCEEDED` when observed pressure exceeds threshold. Distinct from EJ quota DENY and from DX trip-on-failure.
5. Refuse live timers, real network shedding, wall-clock authority, tip-refresh, PRODUCTION_READY flip, L30–L35 reopen, L36 auto-close, schema-json add, Fundacion writes, GHE, secrets, mass prune.
6. Soft-observe freeze pinShort `5e5af281` only — do **not** rewrite freeze/matrix/m4 tip.
7. Hermetic tests EK1–EK17; patcher `scripts/patch-mission-ek.mjs`; OpenSpec `eos-ladder-36-mission-ek`.

## Alternatives Considered AND REJECTED

- Extending EJ admission quotas with pressure/shed fields — REJECTED: EJ is intake-capacity oriented; mixing downstream shed with admit/DENY muddies the L36 admission boundary.
- Extending DX circuit breaker with load-shed fields — REJECTED: DX is failure-threshold oriented; mixing capacity shed with trip/fallback muddies the L33 fault boundary.
- Live timers / real network shedding / Date.now as pressure authority — REJECTED: hermetic injected pressure only.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-EK is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L35 or auto-closing L36 — REJECTED (EL–EN pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.

## Consequences

- Positive: Second L36 satellite seals fail-closed backpressure/load-shed with verifiable `EK-RCPT-*` receipts; EL–EM can compose on this surface.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L35 CLOSED, L36 OPEN (EJ MEASURED; EK this; EL–EN pending), freeze pin `5e5af281` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS/SHED ≠ tip-refresh ≠ PRODUCTION_READY ≠ EJ quota ≠ DX trip ≠ live timers ≠ network shedding.

## Links

- Audit: `docs/releases/EOS_MATURITY_LADDER_36_AUDIT_2026-09-25.md`
- Prior: ADR-0125 (Mission EJ), ADR-0124 (L36 Audit)
- OpenSpec: `openspec/changes/eos-ladder-36-mission-ek/`
