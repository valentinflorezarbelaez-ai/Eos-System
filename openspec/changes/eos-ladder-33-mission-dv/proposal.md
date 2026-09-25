# Proposal — Mission DV Transactional Resilient Outbox Pattern Port (SPEC-0132)

## Why

After Mission DU (#445) seals immutable domain events and tip-refresh-post-445 pins freeze to `cd1512a9` with L33 OPEN (Audit + DU MEASURED · DV–DY pending), Ladder 33 needs its second satellite: reliable outbox persist + at-least-once dispatch seals (`DV-RCPT-*`) composing DU events — without flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L32, or auto-closing L33.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `transactional-outbox-receipt.js` — sealed `DV-RCPT-*` + freeze soft-observe `cd1512a9` + outboxHold
  - `transactional-outbox-policy-gate.js` — fail-closed govern preconditions
  - `transactional-outbox-port.js` — facade (`govern`, `verifyTrail`, softObserveDuPublisher)
- Hermetic tests `tests/eos-dv-transactional-outbox-port.test.js` (~17)
- CRLF-safe patcher `scripts/patch-mission-dv.mjs`
- OpenSpec change, ADR-0108, evidence, release notes

## Non-goals

- PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L33 auto-close;
  L30/L31/L32 reopen; tip-refresh; new schemas JSON; CloudAgent; mass prune;
  unsupervised hard delete; network-bound dispatch in hermetic suite

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L32 | CLOSED — NEVER reopen |
| L33 | OPEN — refuse auto-close (tip status via tip-refresh-post-445) |
| Axis | Sovereign Domain Event-Driven Architecture & Resilient Outbox Messaging Fabric |
| Freeze pin | `cd1512a9` (PR #445 / tip-refresh-post-445 preferred; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | outbox persist/dispatch sealed ≠ PRODUCTION_READY ≠ tip rewrite |
| Tip-refresh | NOT this package |
