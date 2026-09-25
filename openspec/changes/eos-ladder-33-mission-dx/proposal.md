# Proposal — Mission DX Sovereign Circuit Breaker & Resilient Fallback Port (SPEC-0134)

## Why

After Mission DW (#450) seals idempotent consume/dedupe/replay and tip-refresh-post-450 pins freeze to `d667c6b5` with L33 OPEN (Audit + DU + DV + DW MEASURED · DX–DY pending), Ladder 33 needs its fourth satellite: fault-tolerant boundary protection and fail-closed state machines (`DX-RCPT-*`) composing DW consumer / DV outbox / DU domain-event fields — without flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L32, or auto-closing L33.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `circuit-breaker-receipt.js` — sealed `DX-RCPT-*` + freeze soft-observe `d667c6b5` + breakerHold
  - `circuit-breaker-policy-gate.js` — fail-closed govern preconditions
  - `circuit-breaker-port.js` — facade (`govern`, `verifyTrail`, softObserveDwConsumer, softObserveDvOutbox, softObserveDuPublisher)
- Hermetic tests `tests/eos-dx-circuit-breaker-port.test.js` (~17)
- CRLF-safe patcher `scripts/patch-mission-dx.mjs`
- OpenSpec change, ADR-0110, evidence, release notes

## Non-goals

- PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L33 auto-close;
  L30/L31/L32 reopen; tip-refresh; new schemas JSON; CloudAgent; mass prune;
  unsupervised hard delete; asserting soft-observe observed===false only

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L32 | CLOSED — NEVER reopen |
| L33 | OPEN — refuse auto-close (tip status via tip-refresh-post-450: Audit + DU + DV + DW MEASURED · DX–DY pending; after DX lands tip-refresh → DY pending) |
| Axis | Sovereign Domain Event-Driven Architecture & Resilient Outbox Messaging Fabric |
| Freeze pin | `d667c6b5` (PR #450 / tip-refresh-post-450 preferred; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | circuit breaker + resilient fallback seal ≠ PRODUCTION_READY ≠ tip rewrite ≠ L33 auto-close |
| Tip-refresh | NOT this package |
