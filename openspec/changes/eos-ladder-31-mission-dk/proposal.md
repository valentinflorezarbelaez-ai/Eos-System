# Proposal — Mission DK: SpecBoot Mutation Testing Gatekeeper Port

## Problem Statement

Following the integration of the SpecBoot S14 Mutation Testing Audit Harness (ADR-0093 / SPEC-0120) and the formal charter of Ladder 31 (ADR-0094), the system requires an authoritative Layer-0 composition port (`DK-RCPT-*`). This port must:
1. Validate mutation testing audit reports generated during SpecBoot verify rituals.
2. Enforce zero surviving mutants (`survivedMutants === 0`) and verified status before issuing certification.
3. Synthesize a 64-character SHA-256 `mutationDigest` sealing target files, test outcomes, and resilience scores.
4. Hold complexity ceiling invariants (`AT_CEILING 35/35`, `slimHold: true`).
5. Soft-observe freeze pin `2cead226` (Ladder 31 Audit tip) without rewriting tip pins.
6. Strictly reject unauthorized claims: `PRODUCTION_READY` flips, tip-pin rewrites, Ladder 30 reopens, Ladder 31 auto-closures, GHE/GHA green claims, and Fundacion target mutations.

## Proposed Changes

1. Implement Layer-0 receipt module:
   - `src/core/composition/specboot-mutation-gatekeeper-receipt.js`
   - Generates SHA-256 sealed `DK-RCPT-*` receipts over nine canonical fields.
   - Enforces `productionReady='NO'`, `fundacionDelta=0`, freeze soft-observe pin `2cead226`, and `mutationHold { zeroMutantsSurvived: true, resilienceVerified: true }`.
2. Implement policy gate:
   - `src/core/composition/specboot-mutation-gatekeeper-policy-gate.js`
   - Fail-closed evaluation of preconditions: checks `mutationReport`, verifies zero survived mutants, checks minimum mutation score, Law VI secret scanning, Fundacion barrier (`FUNDACION_ALWAYS_DENY`), and prohibition of `PRODUCTION_READY` flip, tip-pin rewrite, L30 reopen, or auto-seal without human gate.
3. Implement port facade:
   - `src/core/composition/specboot-mutation-gatekeeper-port.js`
   - Coordinates `govern`, `evaluate`, and `verifyTrail`.
   - Produces verifiable mutation digests and chains receipts.
4. Comprehensive test suite:
   - `tests/eos-dk-specboot-mutation-gatekeeper-port.test.js` (17 hermetic tests).
5. Tooling & Documentation:
   - ADR-0095, release notes, and OpenSpec delta change `eos-ladder-31-mission-dk`.

## Non-Claims

≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L30 reopen ≠ L31 auto-close ≠ GHE claim ≠ GHA green claim ≠ Fundacion Δ>0.
Mutation gatekeeper is verification only; it does not close Ladder 31 (Missions DL–DO are pending).
