# Proposal — Mission DW Autonomous Idempotent Message Consumer Port (SPEC-0133)

## Why

After Mission DV (#447) seals transactional outbox persist/dispatch and tip-refresh-post-447 pins freeze to `b485ae0b` with L33 OPEN (Audit + DU + DV MEASURED · DW–DY pending), Ladder 33 needs its third satellite: idempotent message consumption, deduplication, and replay protection (`DW-RCPT-*`) composing DV outbox / DU domain-event fields — without flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L32, or auto-closing L33.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `idempotent-message-consumer-receipt.js` — sealed `DW-RCPT-*` + freeze soft-observe `b485ae0b` + consumeHold
  - `idempotent-message-consumer-policy-gate.js` — fail-closed govern preconditions
  - `idempotent-message-consumer-port.js` — facade (`govern`, `verifyTrail`, softObserveDvOutbox, softObserveDuPublisher)
- Hermetic tests `tests/eos-dw-idempotent-message-consumer-port.test.js` (~17)
- CRLF-safe patcher `scripts/patch-mission-dw.mjs`
- OpenSpec change, ADR-0109, evidence, release notes

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
| L33 | OPEN — refuse auto-close (tip status via tip-refresh-post-447: Audit + DU + DV MEASURED · DW–DY pending; after DW lands tip-refresh → DX–DY pending) |
| Axis | Sovereign Domain Event-Driven Architecture & Resilient Outbox Messaging Fabric |
| Freeze pin | `b485ae0b` (PR #447 / tip-refresh-post-447 preferred; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | idempotent consume/dedupe/replay seal ≠ PRODUCTION_READY ≠ tip rewrite ≠ L33 auto-close |
| Tip-refresh | NOT this package |
