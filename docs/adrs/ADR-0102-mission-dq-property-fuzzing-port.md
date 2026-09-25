# ADR-0102 — Mission DQ Autonomous Property-Based Generative Fuzzing Port

- **Status:** Accepted — local governed (Ladder 32 Satellite 2)
- **Date:** 2026-09-24
- **Deciders:** EOS local governed use (Sovereign Screaming Architecture & Deterministic Agentic Execution Fabric)
- **Spec:** SPEC-0127
- **Prior ADRs:** ADR-0100 (Ladder 32 Audit), ADR-0101 (Mission DP Vertical Slice Port)

## Context

Following Mission DP, autonomous verification requires going beyond static unit test cases to verify global invariant properties over vast input spaces. Inspired by Gentleman Programming and LIDR Academy, EOS establishes a generative fuzzing port that tests candidate logic across randomized boundary domains, detecting edge-case counterexamples before changes are applied.

## Decision

1. **Implement Pure Layer-0 Triad (`src/core/composition/property-fuzzing-*.js`)**:
   - `property-fuzzing-receipt.js`: Canonical sealed 9-field `DQ-RCPT-*` receipt generator with soft-observe pin `fc9a0c20`.
   - `property-fuzzing-policy-gate.js`: Policy gate evaluating plan preconditions, ensuring minimum iterations (>= 50), zero counterexamples, Law VI secret scanning, and Fundacion write barrier (`FUNDACION_ALWAYS_DENY`).
   - `property-fuzzing-port.js`: Pure Layer-0 port orchestrating generative fuzzing governance and maintaining a cryptographic receipt trail.

2. **Implement Test Suite (`tests/eos-dq-property-fuzzing-port.test.js`)**:
   - 17 hermetic tests (DQ1–DQ17) covering receipts, gates, and port behavior.
   - Registered in `package.json` as `test:mission-dq` and `test:property-fuzzing`.
   - Excluded from slim runner via `SLIM_SUITE_EXCLUDES` in `scripts/test-runner.js`.

3. **Invariants & Non-Claims**:
   - `PRODUCTION_READY = 'NO'`.
   - `Fundacion Δ=0`.
   - Law VI held (synthetic secret tokens in tests).
   - Schemas strictly held at `AT_CEILING 35/35`.
   - Ladders 17–31 permanently CLOSED — never reopen.

## Alternatives REJECTED

- Accepting runs with unhandled counterexamples — REJECTED: zero falsifications allowed for PASS.
- Skipping minimum iteration thresholds — REJECTED: property testing requires statistical significance.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED: strict non-claim.

## Consequences

- Positive: Codebase invariants are verified through generative property-based fuzzing.
- Invariants Preserved: All 914+ strict verification invariants hold cleanly.
