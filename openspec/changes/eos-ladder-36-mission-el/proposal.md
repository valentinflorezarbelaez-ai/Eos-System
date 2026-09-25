# Proposal — Mission EL Resource Isolation / Bulkhead Boundary (SPEC-0148)

## Why

After L36 OPEN + Audit MEASURED (ADR-0124) + EJ MEASURED (#491) + tip-refresh #492 + EK MEASURED (#493) + tip-refresh #494 (`72697dd5`), Ladder 36 needs its third satellite: a Layer-0 port that seals bulkhead / resource-isolation boundaries into `EL-RCPT-*` receipts — without live threads, real process isolation, wall-clock authority, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L35, auto-closing L36, or network writes. Mission EJ seals intake quotas; Mission EK seals load-shed; Mission DX seals breaker trips; none provides fail-closed isolation so failure or overload in one pool cannot cascade into another.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `resource-isolation-bulkhead-receipt.js` — sealed `EL-RCPT-*` + freeze soft-observe `72697dd5` + bulkheadHold
  - `resource-isolation-bulkhead-policy-gate.js` — fail-closed govern preconditions
  - `resource-isolation-bulkhead-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-el-resource-isolation-bulkhead.test.js` (EL1–EL17)
- CRLF-safe surgical patcher `scripts/patch-mission-el.mjs`
- OpenSpec change, ADR-0127

## Non-goals

- Live threads / real process isolation / wall-clock occupancy authority; EJ intake-quota extension; EK load-shed extension; DX failureThreshold/cooldown extension; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L36 auto-close; L30–L35 reopen; tip-refresh; CloudAgent; mass prune

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L35 | CLOSED — NEVER reopen |
| L36 | OPEN (Audit MEASURED · EJ MEASURED · EK MEASURED · EL this · EM–EN pending) |
| Axis | Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric |
| Freeze pin | `72697dd5` (EK #493 merge / tip-refresh #494; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS/ISOLATE | sealed bulkhead/isolation ≠ tip-refresh ≠ PRODUCTION_READY ≠ EJ quota ≠ EK shed ≠ DX trip |
| Tip-refresh | NOT this package (SEPARATE next) |
