# ADR-0125 — Mission EJ Admission Control & Work-Intake Quotas Port

- **Status:** Accepted — local governed (Ladder 36 / Mission EJ)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric)
- **Spec:** SPEC-0146
- **Prior ADRs:** ADR-0124 (Ladder 36 Maturity Gap Audit), ADR-0123 (Mission EI L35 Closeout)

## Context

Ladder 36 is **OPEN** (tip-open #489 + tip-refresh #490; freeze soft-observe pin `d7490fee`). Formal L30–L35 remain **CLOSED** — **NEVER reopen**. Mission DX seals circuit-breaker trip/fallback receipts (`DX-RCPT-*`) oriented on `failureThreshold` / `cooldownMs` (CLOSED → OPEN → HALF_OPEN). There is **no** Layer-0 admission, intake-quota, or capacity-gate surface under `src/core/composition/`. Long-running processes and messaging can advance without a fail-closed intake bound.

This ADR accepts Mission EJ as the first L36 satellite: a hermetic Admission Control & Work-Intake Quotas Port that seals `EJ-RCPT-*` receipts. Tip-refresh post-EJ is **SEPARATE** and must not land in this package.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `admission-control-intake-receipt.js` — sealed `EJ-RCPT-*` + freeze soft-observe `d7490fee` + `admissionHold`
   - `admission-control-intake-policy-gate.js` — fail-closed govern preconditions
   - `admission-control-intake-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `ADMISSION_CONTROL_WORK_INTAKE_QUOTAS`.
3. Intake requires `intakeId` + `workClass`; optional `maxConcurrent` / `maxQueueDepth`; hermetic injected `observedInflight` / `observedQueued`.
4. Fail-closed `DENY` + code `QUOTA_EXCEEDED` when observed load exceeds quota. Distinct from DX trip-on-failure.
5. Refuse live OS schedulers, network rate limiters, wall-clock authority, tip-refresh, PRODUCTION_READY flip, L30–L35 reopen, L36 auto-close, schema-json add, Fundacion writes, GHE, secrets, mass prune.
6. Soft-observe freeze pinShort `d7490fee` only — do **not** rewrite freeze/matrix/m4 tip.
7. Hermetic tests EJ1–EJ17; patcher `scripts/patch-mission-ej.mjs`; OpenSpec `eos-ladder-36-mission-ej`.

## Alternatives Considered AND REJECTED

- Extending DX circuit breaker with intake fields — REJECTED: DX is failure-threshold oriented; mixing quota admission with trip/fallback muddies the L33 fault boundary.
- Live OS schedulers / real network rate limiters / Date.now as quota authority — REJECTED: hermetic injected load only.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-EJ is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L35 or auto-closing L36 — REJECTED (EK–EN pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.

## Consequences

- Positive: First L36 satellite seals fail-closed work-intake quotas with verifiable `EJ-RCPT-*` receipts; EK–EM can compose on this surface.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L35 CLOSED, L36 OPEN (EJ first; EK–EN pending), freeze pin `d7490fee` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ DX trip ≠ live OS scheduler ≠ network rate limiter.

## Links

- Audit: `docs/releases/EOS_MATURITY_LADDER_36_AUDIT_2026-09-25.md`
- Prior: ADR-0124 (L36 Audit)
- OpenSpec: `openspec/changes/eos-ladder-36-mission-ej/`
