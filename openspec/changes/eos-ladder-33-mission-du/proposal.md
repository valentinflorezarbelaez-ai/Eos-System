# Proposal — Mission DU Sovereign Pure Domain Event Publisher Port (SPEC-0131)

## Why

After L32 CLOSED + L33 audit (ADR-0106) + tip-honesty L30–L33 + tip-refresh post-#442 (`b205ce8c`), Ladder 33 needs its first satellite: a Layer-0 port that seals immutable domain events from aggregate state changes into `DU-RCPT-*` receipts — without outbox dispatch (DV later), flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L32, or auto-closing L33.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `domain-event-publisher-receipt.js` — sealed `DU-RCPT-*` + freeze soft-observe `b205ce8c` + publishHold
  - `domain-event-publisher-policy-gate.js` — fail-closed govern preconditions
  - `domain-event-publisher-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-du-domain-event-publisher-port.test.js` (~17)
- CRLF-safe patcher `scripts/patch-mission-du.mjs`
- OpenSpec change, ADR-0107, evidence, release notes

## Non-goals

- Outbox dispatch (DV later); PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE;
  L33 auto-close; L30/L31/L32 reopen; tip-refresh; new schemas JSON; CloudAgent; mass prune

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L32 | CLOSED — NEVER reopen |
| L33 | OPEN (Audit MEASURED · DU–DY pending) |
| Axis | Sovereign Domain Event-Driven Architecture & Resilient Outbox Messaging Fabric |
| Freeze pin | `b205ce8c` (PR #442 / tip-refresh-post-442 preferred; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | sealed domain event publish ≠ outbox dispatch ≠ PRODUCTION_READY |
| Tip-refresh | NOT this package |
