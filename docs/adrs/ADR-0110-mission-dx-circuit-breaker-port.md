# ADR-0110 — Mission DX Sovereign Circuit Breaker & Resilient Fallback Port

- **Status:** Accepted — local governed (Ladder 33 Satellite 4)
- **Date:** 2026-09-25
- **Deciders:** EOS local governed use (Sovereign Domain Event-Driven Architecture & Resilient Outbox Messaging Fabric)
- **Spec:** SPEC-0134
- **Prior ADRs:** ADR-0109 (Mission DW Idempotent Message Consumer), ADR-0108 (Mission DV Transactional Outbox), ADR-0107 (Mission DU Domain Event Publisher), ADR-0106 (Ladder 33 Audit), ADR-0105 (Mission DT / L32 closeout)

## Context

After Mission DW seals idempotent consume/dedupe/replay (`DW-RCPT-*`) and tip-refresh-post-450 pins freeze to `d667c6b5` with L33 OPEN (Audit + DU + DV + DW MEASURED · DX–DY pending), Ladder 33 needs its fourth satellite: fault-tolerant boundary protection and fail-closed state machines (`DX-RCPT-*`) composing DW consumer / DV outbox / DU domain-event fields — without flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L32, or auto-closing L33.

## Decision

1. **Implement Pure Layer-0 Triad (`src/core/composition/circuit-breaker-*.js`)**:
   - `circuit-breaker-receipt.js`: Canonical sealed 9-field `DX-RCPT-*` receipt generator with soft-observe pin `d667c6b5` (tip-refresh-post-450 / PR #450 Mission DW merge tip).
   - `circuit-breaker-policy-gate.js`: Policy gate requiring `breakerId` + `protectedOperation`, refusing tip rewrite / PR flip / GHE / L30–L32 reopen / L33 auto-close / mass prune / secrets / Fundacion writes / unsupervised hard delete.
   - `circuit-breaker-port.js`: Pure Layer-0 port orchestrating CLOSED/OPEN/HALF_OPEN fail-closed state machine + resilient fallback seals; soft-imports DW consumer observe when present; optionally soft-observes DV outbox / DU publisher; maintains cryptographic receipt trail.

2. **Implement Test Suite (`tests/eos-dx-circuit-breaker-port.test.js`)**:
   - 17 hermetic tests (DX1–DX17) covering receipts, gates, and port behavior.
   - Registered in `package.json` as `test:mission-dx` and `test:circuit-breaker`.
   - Excluded from slim runner via `SLIM_SUITE_EXCLUDES` in `scripts/test-runner.js`.

3. **Invariants & Non-Claims**:
   - `PRODUCTION_READY = 'NO'`.
   - `Fundacion Δ=0`.
   - Law VI held (synthetic secret tokens in tests).
   - Schemas strictly held at `AT_CEILING 35/35`.
   - Ladders 17–32 permanently CLOSED — **NEVER reopen L30–L32**.
   - L33 remains OPEN (Audit + DU + DV + DW MEASURED · DX–DY pending after tip-refresh-post-450) — refuse L33 auto-close. After DX lands tip-refresh will advance to DY pending — this mission package does NOT tip-refresh / rewrite tip status.
   - Soft-observe freeze pin `d667c6b5` only — do NOT rewrite freeze tip pins from this package.
   - Soft-import DW consumer observe when present; optionally soft-observe DV outbox / DU publisher; compose DW/DV/DU fields on seal.
   - Soft-observe tests accept `observed === true | false` (DV15/DW14 host lesson).
   - **PASS = circuit breaker + resilient fallback seal ≠ PRODUCTION_READY ≠ tip rewrite ≠ L33 auto-close.**

## Alternatives REJECTED

- Flipping `PRODUCTION_READY` to `YES` — REJECTED: strict non-claim.
- Auto-closing Ladder 33 after DX — REJECTED: DY still pending.
- Rewriting freeze tip pins from the mission package — REJECTED: soft-observe only.
- Tip-refresh inside this package — REJECTED: tip-refresh is separate (parent after apply).
- Asserting soft-observe `observed === false` only — REJECTED: host may have DW/DV/DU present.

## Consequences

- Positive: Boundaries can be fail-closed protected with cryptographic `DX-RCPT-*` receipts composing DW/DV/DU fields; CLOSED→OPEN trip + resilient fallback; cooldown HALF_OPEN probe recovery.
- Invariants Preserved: hermetic DX suite green; host verify:strict expected to hold after apply.
