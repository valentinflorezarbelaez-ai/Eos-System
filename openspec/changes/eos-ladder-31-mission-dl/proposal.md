# Proposal — Mission DL: Adversarial Invariant Refuter Port

## Problem Statement

To complement mutation testing and ensure that proposed specifications and tasks do not introduce subtle invariant gaps or unhandled edge cases, the system requires an authoritative Layer-0 composition port (`DL-RCPT-*`). This port must:
1. Validate adversarial refutation reports challenging system invariants with chaos attack vectors.
2. Enforce that zero invariant breaches remain unhandled (`unhandledBreaches === 0`) and resilience status is not compromised.
3. Support CHALLENGE decisions when non-fatal warnings or soft-breaks are identified under governed conditions.
4. Synthesize a 64-character SHA-256 `refutationDigest` sealing refutation parameters, vector logs, and resilience outcomes.
5. Hold complexity ceiling invariants (`AT_CEILING 35/35`, `slimHold: true`).
6. Soft-observe freeze pin `20cb9abd` (Mission DK tip) without rewriting tip pins.
7. Strictly reject unauthorized claims: `PRODUCTION_READY` flips, tip-pin rewrites, Ladder 30 reopens, Ladder 31 auto-closures, GHE/GHA green claims, and Fundacion target mutations.

## Proposed Changes

1. Implement Layer-0 receipt module:
   - `src/core/composition/adversarial-invariant-refuter-receipt.js`
   - Generates SHA-256 sealed `DL-RCPT-*` receipts over nine canonical fields.
   - Enforces `productionReady='NO'`, `fundacionDelta=0`, freeze soft-observe pin `20cb9abd`, and `refutationHold { invariantsWithstood: true, zeroBreachesUnhandled: true }`.
2. Implement policy gate:
   - `src/core/composition/adversarial-invariant-refuter-policy-gate.js`
   - Fail-closed evaluation of preconditions: checks `refutationReport`, verifies zero unhandled breaches, validates resilience status, Law VI secret scanning, Fundacion barrier (`FUNDACION_ALWAYS_DENY`), and prohibition of `PRODUCTION_READY` flip, tip-pin rewrite, L30 reopen, or auto-seal without human gate.
3. Implement port facade:
   - `src/core/composition/adversarial-invariant-refuter-port.js`
   - Coordinates `govern`, `evaluate`, and `verifyTrail`.
   - Produces verifiable refutation digests and chains receipts.
4. Comprehensive test suite:
   - `tests/eos-dl-adversarial-invariant-refuter-port.test.js` (17 hermetic tests).
5. Tooling & Documentation:
   - ADR-0096, release notes, and OpenSpec delta change `eos-ladder-31-mission-dl`.

## Non-Claims

≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L30 reopen ≠ L31 auto-close ≠ GHE claim ≠ GHA green claim ≠ Fundacion Δ>0.
Adversarial refuter is verification only; it does not close Ladder 31 (Missions DM–DO are pending).
