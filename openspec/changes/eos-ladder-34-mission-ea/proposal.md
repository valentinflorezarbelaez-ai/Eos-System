# Proposal — Mission EA CQRS Read-Model Projection Port (SPEC-0137)

## Why

After L34 OPEN + Mission DZ MEASURED (ADR-0113) + tip-refresh #462 (`1f2234cf`), Ladder 34 needs its second satellite: a Layer-0 port that seals CQRS read-model projection apply/rebuild into `EA-RCPT-*` receipts — without treating projections as a second source of truth, dual-write, network writes, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L33, auto-closing L34, or adding schema JSON.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `cqrs-read-model-projection-receipt.js` — sealed `EA-RCPT-*` + freeze soft-observe `1f2234cf` + projectionHold
  - `cqrs-read-model-projection-policy-gate.js` — fail-closed govern preconditions
  - `cqrs-read-model-projection-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-ea-cqrs-read-model-projection-port.test.js` (~17)
- CRLF-safe surgical patcher `scripts/patch-mission-ea.mjs`
- OpenSpec change, ADR-0114

## Non-goals

- Second SoT; dual-write; live DB rebuild; network write; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE;
  L34 auto-close; L30–L33 reopen; tip-refresh; new schemas JSON; CloudAgent; mass prune

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L33 | CLOSED — NEVER reopen |
| L34 | OPEN (Audit MEASURED · DZ MEASURED · EA–ED pending) |
| Axis | Sovereign Process Orchestration, CQRS Projection & Dead-Letter Governance Fabric |
| Freeze pin | `1f2234cf` (PR #461 DZ merge / tip-refresh #462; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | sealed projection ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY ≠ second SoT |
| Tip-refresh | NOT this package (SEPARATE next) |