# Proposal — Mission DZ Sovereign Process Manager / Saga Orchestration Port (SPEC-0136)

## Why

After L33 CLOSED + L34 audit (ADR-0112) + tip-open #459 + tip-refresh post-#460 (`b382d29b`), Ladder 34 needs its first satellite: a Layer-0 port that seals multi-step process / saga orchestration across aggregates into `DZ-RCPT-*` receipts — without dual-write chaos, network writes, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L33, auto-closing L34, or adding schema JSON.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `process-manager-saga-receipt.js` — sealed `DZ-RCPT-*` + freeze soft-observe `b382d29b` + sagaHold
  - `process-manager-saga-policy-gate.js` — fail-closed govern preconditions
  - `process-manager-saga-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-dz-process-manager-saga-port.test.js` (~17)
- CRLF-safe surgical patcher `scripts/patch-mission-dz.mjs`
- OpenSpec change, ADR-0113

## Non-goals

- Dual-write; outbox mutation; network write; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE;
  L34 auto-close; L30–L33 reopen; tip-refresh; new schemas JSON; CloudAgent; mass prune

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L33 | CLOSED — NEVER reopen |
| L34 | OPEN (Audit MEASURED · DZ–ED pending) |
| Axis | Sovereign Process Orchestration, CQRS Projection & Dead-Letter Governance Fabric |
| Freeze pin | `b382d29b` (PR #460 / tip-refresh-post-460 preferred; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | sealed process/saga step ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY |
| Tip-refresh | NOT this package (SEPARATE next) |
