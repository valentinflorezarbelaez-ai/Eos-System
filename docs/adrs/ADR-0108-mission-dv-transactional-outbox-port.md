# ADR-0108 — Mission DV Transactional Resilient Outbox Pattern Port

- **Status:** Accepted — local governed (Ladder 33 Satellite 2)
- **Date:** 2026-09-25
- **Deciders:** EOS local governed use (Sovereign Domain Event-Driven Architecture & Resilient Outbox Messaging Fabric)
- **Spec:** SPEC-0132
- **Prior ADRs:** ADR-0107 (Mission DU Domain Event Publisher), ADR-0106 (Ladder 33 Audit), ADR-0105 (Mission DT / L32 closeout)

## Context

After Mission DU seals immutable domain events (`DU-RCPT-*`), Ladder 33 needs reliable persistence and guaranteed at-least-once outbox dispatch (`DV-RCPT-*`) without flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L32, or auto-closing L33.

## Decision

1. **Implement Pure Layer-0 Triad (`src/core/composition/transactional-outbox-*.js`)**:
   - `transactional-outbox-receipt.js`: Canonical sealed 9-field `DV-RCPT-*` receipt generator with soft-observe pin `cd1512a9` (tip-refresh-post-445 / PR #445 Mission DU merge).
   - `transactional-outbox-policy-gate.js`: Policy gate requiring `domainEvent` (compose DU) + `outboxRecord.outboxId`, refusing tip rewrite / PR flip / GHE / L30–L32 reopen / L33 auto-close / mass prune / secrets / Fundacion writes / unsupervised hard delete.
   - `transactional-outbox-port.js`: Pure Layer-0 port orchestrating persist + at-least-once dispatch seals; soft-imports DU publisher observe when present; maintains cryptographic receipt trail.

2. **Implement Test Suite (`tests/eos-dv-transactional-outbox-port.test.js`)**:
   - 17 hermetic tests (DV1–DV17) covering receipts, gates, and port behavior.
   - Registered in `package.json` as `test:mission-dv` and `test:transactional-outbox`.
   - Excluded from slim runner via `SLIM_SUITE_EXCLUDES` in `scripts/test-runner.js`.

3. **Invariants & Non-Claims**:
   - `PRODUCTION_READY = 'NO'`.
   - `Fundacion Δ=0`.
   - Law VI held (synthetic secret tokens in tests).
   - Schemas strictly held at `AT_CEILING 35/35`.
   - Ladders 17–32 permanently CLOSED — **NEVER reopen L30–L32**.
   - L33 remains OPEN (Audit + DU MEASURED · DV–DY pending after tip-refresh-post-445) — refuse L33 auto-close. This mission package does NOT rewrite tip status; tip-refresh is separate.
   - Soft-observe freeze pin `cd1512a9` only — do NOT rewrite freeze tip pins from this package.
   - Soft-import DU publisher observe when present; compose DU events.
   - **PASS = outbox persist/dispatch sealed ≠ PRODUCTION_READY ≠ tip rewrite.**

## Alternatives REJECTED

- Flipping `PRODUCTION_READY` to `YES` — REJECTED: strict non-claim.
- Auto-closing Ladder 33 after DV — REJECTED: DV–DY still pending (DW–DY remain).
- Rewriting freeze tip pins from the mission package — REJECTED: soft-observe only.
- Network-bound dispatch in hermetic tests — REJECTED: seal-only at-least-once status.

## Consequences

- Positive: Domain events can be persisted and dispatch-sealed with cryptographic `DV-RCPT-*` receipts composing DU events.
- Invariants Preserved: hermetic DV suite green; host verify:strict expected to hold after apply.
