# Proposal — Mission DN: Sovereign Epistemic Knowledge Ledger Port

## Problem Statement

To prevent hallucinations, ungrounded task completion claims, and invalid epistemic state jumps (e.g. claiming `VERIFIED` without executing automated test suites or capturing raw terminal logs), the system requires an authoritative Layer-0 composition port (`DN-RCPT-*`). This port must:
1. Validate epistemic state transitions according to the strict EOS Epistemic Taxonomy: `AUDIT_EXECUTED` (or `REVALIDATION_REQUIRED`) ➔ `VERIFIED`.
2. Enforce that zero truth claims may be certified without non-zero passing test checks and a verifiable SHA-256 evidence hash.
3. Reject direct claims of `PRODUCTION_READY`.
4. Synthesize a 64-character SHA-256 `epistemicDigest` sealing state transition provenance and evidence custody.
5. Hold complexity ceiling invariants (`AT_CEILING 35/35`, `slimHold: true`).
6. Soft-observe freeze pin `079e6f2a` (Mission DM tip) without rewriting tip pins.
7. Strictly reject unauthorized claims: `PRODUCTION_READY` flips, tip-pin rewrites, Ladder 30 reopens, Ladder 31 auto-closures, GHE/GHA green claims, and Fundacion target mutations.

## Proposed Changes

1. Implement Layer-0 receipt module:
   - `src/core/composition/sovereign-epistemic-ledger-receipt.js`
   - Generates SHA-256 sealed `DN-RCPT-*` receipts over nine canonical fields.
   - Enforces `productionReady='NO'`, `fundacionDelta=0`, freeze soft-observe pin `079e6f2a`, and `epistemicHold { epistemicStateGrounded: true, ungroundedClaimsRefused: true }`.
2. Implement policy gate:
   - `src/core/composition/sovereign-epistemic-ledger-policy-gate.js`
   - Fail-closed evaluation of preconditions: checks `epistemicReport`, validates legal state transitions, requires `checksPassed > 0` and 64-char `evidenceHash`, Law VI secret scanning, Fundacion barrier (`FUNDACION_ALWAYS_DENY`), and prohibition of `PRODUCTION_READY` flip, tip-pin rewrite, L30 reopen, or auto-seal without human gate.
3. Implement port facade:
   - `src/core/composition/sovereign-epistemic-ledger-port.js`
   - Coordinates `govern`, `evaluate`, and `verifyTrail`.
   - Produces verifiable epistemic digests and chains receipts.
4. Comprehensive test suite:
   - `tests/eos-dn-sovereign-epistemic-ledger-port.test.js` (17 hermetic tests).
5. Tooling & Documentation:
   - ADR-0098, release notes, and OpenSpec delta change `eos-ladder-31-mission-dn`.

## Non-Claims

≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L30 reopen ≠ L31 auto-close ≠ GHE claim ≠ GHA green claim ≠ Fundacion Δ>0.
Epistemic ledger is verification only; it does not close Ladder 31 (Mission DO is pending).
