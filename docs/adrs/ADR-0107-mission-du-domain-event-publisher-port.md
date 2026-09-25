# ADR-0107 — Mission DU Sovereign Pure Domain Event Publisher Port

- **Status:** Accepted — local governed (Ladder 33 Satellite 1)
- **Date:** 2026-09-25
- **Deciders:** EOS local governed use (Sovereign Domain Event-Driven Architecture & Resilient Outbox Messaging Fabric)
- **Spec:** SPEC-0131
- **Prior ADRs:** ADR-0106 (Ladder 33 Audit), ADR-0105 (Mission DT / L32 closeout)

## Context

Aggregate state changes that remain coupled to persistence and messaging sides create anemic domains and unreliable event boundaries. Ladder 33 opens with a pure Layer-0 Domain Event Publisher Port that seals immutable domain events (`DU-RCPT-*`) without performing outbox dispatch (DV later), flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L32, or auto-closing L33.

## Decision

1. **Implement Pure Layer-0 Triad (`src/core/composition/domain-event-publisher-*.js`)**:
   - `domain-event-publisher-receipt.js`: Canonical sealed 9-field `DU-RCPT-*` receipt generator with soft-observe pin `b205ce8c`.
   - `domain-event-publisher-policy-gate.js`: Policy gate evaluating plan preconditions, requiring `domainEvent.eventType` + `aggregateId` + non-empty payload, refusing outbox dispatch / tip rewrite / PR flip / GHE / L30–L32 reopen / L33 auto-close / mass prune / secrets / Fundacion writes.
   - `domain-event-publisher-port.js`: Pure Layer-0 port orchestrating domain-event publish and maintaining a cryptographic receipt trail.

2. **Implement Test Suite (`tests/eos-du-domain-event-publisher-port.test.js`)**:
   - 17 hermetic tests (DU1–DU17) covering receipts, gates, and port behavior.
   - Registered in `package.json` as `test:mission-du` and `test:domain-event-publisher`.
   - Excluded from slim runner via `SLIM_SUITE_EXCLUDES` in `scripts/test-runner.js`.

3. **Invariants & Non-Claims**:
   - `PRODUCTION_READY = 'NO'`.
   - `Fundacion Δ=0`.
   - Law VI held (synthetic secret tokens in tests).
   - Schemas strictly held at `AT_CEILING 35/35`.
   - Ladders 17–32 permanently CLOSED — **NEVER reopen L30–L32**.
   - L33 remains OPEN (Audit MEASURED · DU–DY pending) — refuse L33 auto-close.
   - Soft-observe freeze pin `b205ce8c` only — do NOT rewrite freeze tip pins from this package.
   - **PASS = sealed domain event publish receipt ≠ outbox dispatch (DV later) ≠ PRODUCTION_READY.**

## Alternatives REJECTED

- Coupling publish to outbox dispatch in the same port — REJECTED: DV later.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED: strict non-claim.
- Auto-closing Ladder 33 after DU — REJECTED: DU–DY pending.
- Rewriting freeze tip pins from the mission package — REJECTED: soft-observe only.

## Consequences

- Positive: Aggregate state changes can be sealed as immutable domain events with cryptographic receipts.
- Invariants Preserved: hermetic DU suite green; host verify:strict expected to hold after apply.
