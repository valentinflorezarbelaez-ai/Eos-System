# Proposal — Mission DM: Hexagonal Architecture Boundary Isolation Port

## Problem Statement

To protect Clean Architecture principles and enforce `DEPENDENCY_POLICY_L0.md` (`NODE_BUILTINS_ONLY`), the system requires an authoritative Layer-0 composition port (`DM-RCPT-*`). This port must:
1. Validate architectural boundary reports scanning module imports and dependency DAGs.
2. Enforce that pure Domain and Core logic (Layer 0) contains zero external npm dependencies or infrastructure coupling.
3. Validate that adapters remain strictly behind abstract interfaces/ports.
4. Enforce that zero architectural boundary violations exist (`violationsCount === 0`) and status is `ISOLATED`.
5. Synthesize a 64-character SHA-256 `boundaryDigest` sealing module metrics and boundary integrity status.
6. Hold complexity ceiling invariants (`AT_CEILING 35/35`, `slimHold: true`).
7. Soft-observe freeze pin `f367a1cf` (Mission DL tip) without rewriting tip pins.
8. Strictly reject unauthorized claims: `PRODUCTION_READY` flips, tip-pin rewrites, Ladder 30 reopens, Ladder 31 auto-closures, GHE/GHA green claims, and Fundacion target mutations.

## Proposed Changes

1. Implement Layer-0 receipt module:
   - `src/core/composition/hexagonal-boundary-isolation-receipt.js`
   - Generates SHA-256 sealed `DM-RCPT-*` receipts over nine canonical fields.
   - Enforces `productionReady='NO'`, `fundacionDelta=0`, freeze soft-observe pin `f367a1cf`, and `boundaryHold { layer0Pure: true, zeroBoundaryViolations: true }`.
2. Implement policy gate:
   - `src/core/composition/hexagonal-boundary-isolation-policy-gate.js`
   - Fail-closed evaluation of preconditions: checks `boundaryReport`, verifies zero violations, validates Layer 0 purity (zero non-builtin imports), Law VI secret scanning, Fundacion barrier (`FUNDACION_ALWAYS_DENY`), and prohibition of `PRODUCTION_READY` flip, tip-pin rewrite, L30 reopen, or auto-seal without human gate.
3. Implement port facade:
   - `src/core/composition/hexagonal-boundary-isolation-port.js`
   - Coordinates `govern`, `evaluate`, and `verifyTrail`.
   - Produces verifiable boundary digests and chains receipts.
4. Comprehensive test suite:
   - `tests/eos-dm-hexagonal-boundary-isolation-port.test.js` (17 hermetic tests).
5. Tooling & Documentation:
   - ADR-0097, release notes, and OpenSpec delta change `eos-ladder-31-mission-dm`.

## Non-Claims

≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L30 reopen ≠ L31 auto-close ≠ GHE claim ≠ GHA green claim ≠ Fundacion Δ>0.
Boundary isolation is verification only; it does not close Ladder 31 (Missions DN–DO are pending).
