# Proposal — Mission DI: Post-Disposition Integrity & Docs SSOT Hold Ritual Port

## Problem Statement

Following the execution of Mission DH (Quarantine / Soft-Remove Execution Port), where approved deprecated files are relocated into `.quarantine/`, the system requires an authoritative Layer-0 verification ritual port (`DI-RCPT-*`). This port must:
1. Verify post-disposition integrity by checking deterministic audit pass status (composing `verify:strict` output).
2. Enforce documentation SSOT consistency, verifying that release notes, ADRs, and change records reflect the quarantine state without doc drift.
3. Hold complexity ceiling invariants (`AT_CEILING 35/35`, `slimHold: true`).
4. Soft-observe freeze pin `3d0c2e0b` (Mission DH tip) without rewriting tip pins.
5. Strictly reject unauthorized claims: `PRODUCTION_READY` flips, tip-pin rewrites, Ladder 29 reopens, Ladder 30 auto-closures, GHE/GHA green claims, and Fundacion target mutations.

## Proposed Changes

1. Implement Layer-0 receipt module:
   - `src/core/composition/post-disposition-integrity-hold-receipt.js`
   - Generates SHA-256 sealed `DI-RCPT-*` receipts over nine canonical fields.
   - Enforces `productionReady='NO'`, `fundacionDelta=0`, freeze soft-observe pin `3d0c2e0b`, and `ceilingHold { schemasAtCeiling: true, slimHold: true }`.
2. Implement policy gate:
   - `src/core/composition/post-disposition-integrity-hold-policy-gate.js`
   - Fail-closed evaluation of preconditions: checks linked `DH-RCPT-*` receipt, integrity test status (`VERIFIED`), docs SSOT completeness, Law VI secret scanning, Fundacion barrier (`FUNDACION_ALWAYS_DENY`), and prohibition of `PRODUCTION_READY` flip, tip-pin rewrite, L29 reopen, or auto-seal without human gate.
3. Implement port facade:
   - `src/core/composition/post-disposition-integrity-hold-port.js`
   - Coordinates `govern`, `evaluate`, and `verifyTrail`.
   - Produces verifiable integrity digests and chains receipts.
4. Comprehensive test suite:
   - `tests/eos-di-post-disposition-integrity-hold-port.test.js` (~17 hermetic tests).
5. Tooling & Documentation:
   - CRLF-safe host patcher: `scripts/patch-mission-di.mjs`.
   - ADR-0091, release notes, and evidence documentation.

## Non-Claims

≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L29 reopen ≠ L30 auto-close ≠ GHE claim ≠ GHA green claim ≠ Fundacion Δ>0.
Post-disposition integrity hold is verification only; it does not close Ladder 30 (Mission DJ is pending).
