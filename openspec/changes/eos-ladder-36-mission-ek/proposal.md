# Proposal — Mission EK Backpressure & Load-Shed Governance (SPEC-0147)

## Why

After L36 OPEN + Audit MEASURED (ADR-0124) + EJ MEASURED (#491) + tip-refresh #492 (`5e5af281`), Ladder 36 needs its second satellite: a Layer-0 port that seals downstream backpressure / load-shed governance into `EK-RCPT-*` receipts — without live timers, real network shedding, wall-clock authority, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L35, auto-closing L36, or network writes. Mission EJ seals intake quotas; Mission DX seals breaker trips; neither provides fail-closed shed when **admitted** work still overwhelms capacity.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `backpressure-load-shed-receipt.js` — sealed `EK-RCPT-*` + freeze soft-observe `5e5af281` + loadShedHold
  - `backpressure-load-shed-policy-gate.js` — fail-closed govern preconditions
  - `backpressure-load-shed-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-ek-backpressure-load-shed.test.js` (EK1–EK17)
- CRLF-safe surgical patcher `scripts/patch-mission-ek.mjs`
- OpenSpec change, ADR-0126

## Non-goals

- Live timers / real network shedding / wall-clock pressure authority; EJ intake-quota extension; DX failureThreshold/cooldown extension; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L36 auto-close; L30–L35 reopen; tip-refresh; CloudAgent; mass prune

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L35 | CLOSED — NEVER reopen |
| L36 | OPEN (Audit MEASURED · EJ MEASURED · EK this · EL–EN pending) |
| Axis | Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric |
| Freeze pin | `5e5af281` (EJ #491 merge / tip-refresh #492; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS/SHED | sealed backpressure/load-shed ≠ tip-refresh ≠ PRODUCTION_READY ≠ EJ quota ≠ DX trip |
| Tip-refresh | NOT this package (SEPARATE next) |
