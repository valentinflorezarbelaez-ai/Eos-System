# ADR-0109 — Mission DW Autonomous Idempotent Message Consumer Port

- **Status:** Accepted — local governed (Ladder 33 Satellite 3)
- **Date:** 2026-09-25
- **Deciders:** EOS local governed use (Sovereign Domain Event-Driven Architecture & Resilient Outbox Messaging Fabric)
- **Spec:** SPEC-0133
- **Prior ADRs:** ADR-0108 (Mission DV Transactional Outbox), ADR-0107 (Mission DU Domain Event Publisher), ADR-0106 (Ladder 33 Audit), ADR-0105 (Mission DT / L32 closeout)

## Context

After Mission DV seals transactional outbox persist/dispatch (`DV-RCPT-*`) and tip-refresh-post-447 pins freeze to `b485ae0b` with L33 OPEN (Audit + DU + DV MEASURED · DW–DY pending), Ladder 33 needs its third satellite: idempotent message consumption, deduplication, and replay protection (`DW-RCPT-*`) composing DV outbox / DU domain-event fields — without flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L32, or auto-closing L33.

## Decision

1. **Implement Pure Layer-0 Triad (`src/core/composition/idempotent-message-consumer-*.js`)**:
   - `idempotent-message-consumer-receipt.js`: Canonical sealed 9-field `DW-RCPT-*` receipt generator with soft-observe pin `b485ae0b` (tip-refresh-post-447 / PR #447 Mission DV merge).
   - `idempotent-message-consumer-policy-gate.js`: Policy gate requiring `message.messageId` + non-empty payload + `consumerId`, refusing tip rewrite / PR flip / GHE / L30–L32 reopen / L33 auto-close / mass prune / secrets / Fundacion writes / unsupervised hard delete.
   - `idempotent-message-consumer-port.js`: Pure Layer-0 port orchestrating idempotent consume + dedupe + replay-protect seals; soft-imports DV outbox observe when present; optionally soft-observes DU publisher; maintains cryptographic receipt trail.

2. **Implement Test Suite (`tests/eos-dw-idempotent-message-consumer-port.test.js`)**:
   - 17 hermetic tests (DW1–DW17) covering receipts, gates, and port behavior.
   - Registered in `package.json` as `test:mission-dw` and `test:idempotent-message-consumer`.
   - Excluded from slim runner via `SLIM_SUITE_EXCLUDES` in `scripts/test-runner.js`.

3. **Invariants & Non-Claims**:
   - `PRODUCTION_READY = 'NO'`.
   - `Fundacion Δ=0`.
   - Law VI held (synthetic secret tokens in tests).
   - Schemas strictly held at `AT_CEILING 35/35`.
   - Ladders 17–32 permanently CLOSED — **NEVER reopen L30–L32**.
   - L33 remains OPEN (Audit + DU + DV MEASURED · DW–DY pending after tip-refresh-post-447) — refuse L33 auto-close. After DW lands tip-refresh will advance to DX–DY pending — this mission package does NOT tip-refresh / rewrite tip status.
   - Soft-observe freeze pin `b485ae0b` only — do NOT rewrite freeze tip pins from this package.
   - Soft-import DV outbox observe when present; optionally soft-observe DU publisher; compose DV outbox / DU domain-event fields on seal.
   - Soft-observe tests accept `observed === true | false` (DV15 host lesson).
   - **PASS = idempotent consume/dedupe/replay seal ≠ PRODUCTION_READY ≠ tip rewrite ≠ L33 auto-close.**

## Alternatives REJECTED

- Flipping `PRODUCTION_READY` to `YES` — REJECTED: strict non-claim.
- Auto-closing Ladder 33 after DW — REJECTED: DX–DY still pending.
- Rewriting freeze tip pins from the mission package — REJECTED: soft-observe only.
- Tip-refresh inside this package — REJECTED: tip-refresh is separate (parent after apply).
- Asserting soft-observe `observed === false` only — REJECTED: host may have DV/DU present.

## Consequences

- Positive: Messages can be idempotently consumed with cryptographic `DW-RCPT-*` receipts composing DV outbox / DU domain-event fields; duplicate delivery is deduped; digest-mismatched replay is rejected.
- Invariants Preserved: hermetic DW suite green; host verify:strict expected to hold after apply.
