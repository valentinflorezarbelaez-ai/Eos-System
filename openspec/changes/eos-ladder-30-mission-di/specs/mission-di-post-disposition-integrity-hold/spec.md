# Spec — Mission DI Post-Disposition Integrity & Docs SSOT Hold Ritual Port (SPEC-0118)

## Purpose

Governed Layer-0 Post-Disposition Integrity & Docs SSOT Hold Ritual port under freeze NON-CLAIM soft-observe, sealing `DI-RCPT-*` receipts with PASS|DENY|HOLD. Verifies post-quarantine deterministic integrity suites and enforces documentation SSOT consistency while holding complexity ceilings and refusing unauthorized privilege escalations.

## Requirements

### Requirement: Deterministic Receipt Sealing

The system MUST seal nine canonical fields with SHA-256 via `node:crypto`.
- SHALL prefix receipt IDs with `DI-RCPT-`.
- SHALL enforce `productionReady='NO'` and `fundacionDelta=0`.
- SHALL attach freeze soft-observe with pin `3d0c2e0b`, `tipRewriteRefused=true`, and `productionReadyFlipRefused=true`.
- SHALL attach ceilingHold with `schemasAtCeiling=true` and `slimHold=true`.
- SHALL record `dhReceiptLink`, `docsSsotHold`, and `integrityDigest`.

### Requirement: Policy Gate Pre-Execution Verification

The system MUST enforce strict preconditions before issuing a PASS decision.
- SHALL require valid `planId`, `changeId`, and `ritualMode` (`ACTIVE`|`HOLD`|`DRY_RUN`).
- SHALL require a linked approved `DH-RCPT-*` quarantine receipt with `decision='PASS'`.
- SHALL require integrity verification checks to be `VERIFIED` with zero failures.
- SHALL DENY Law VI secrets, Fundacion targets (`FUNDACION_ALWAYS_DENY`), `PRODUCTION_READY` flip, tip-pin rewrite, Ladder 29 reopen, Ladder 30 auto-close, and GHE claims.

### Requirement: Port Facade & Cryptographic Trail

The system MUST provide a high-integrity evaluation interface.
- SHALL expose `govern(plan)` and `verifyTrail()`.
- SHALL compute deterministic `integrityDigest` combining test verification results and docs SSOT state.
- SHALL append each receipt to an internal trail chained via `prevReceiptHash`.
- SHALL verify full cryptographic integrity and chaining on `verifyTrail()`.
- SHALL NOT mutate tip pins or close Ladder 30.

## Non-Claims

≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L29 reopen ≠ L30 auto-close ≠ GHE claim ≠ GHA green claim ≠ Fundacion Δ>0.
Post-disposition integrity hold is verification and documentation consistency only.
