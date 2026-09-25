# Spec — Mission DH Quarantine / Soft-Remove Execution Port (SPEC-0117)

## Purpose

Governed Layer-0 Quarantine / Soft-Remove Execution port under freeze NON-CLAIM soft-observe, sealing `DH-RCPT-*` receipts with PASS|DENY|HOLD. Executes reversible, non-destructive file isolation of DG-approved named paths, strictly prohibiting unrecoverable hard deletion or mass pruning.

## Requirements

### Requirement: Deterministic Receipt Sealing

The system MUST seal nine canonical fields with SHA-256 via `node:crypto`.
- SHALL prefix receipt IDs with `DH-RCPT-`.
- SHALL enforce `productionReady='NO'` and `fundacionDelta=0`.
- SHALL attach freeze soft-observe with pin `06af7278`, `hardDeleteRefused=true`, and `massPruneRefused=true`.
- SHALL attach ceilingHold with `schemasAtCeiling=true` and `slimHold=true`.
- SHALL record `quarantinedPaths[]`, `quarantineDir`, and `manifestDigest`.

### Requirement: Policy Gate Pre-Execution Verification

The system MUST enforce strict pre-execution invariants before executing any file quarantine.
- SHALL require `planId`, `changeId`, `executionMode` (`ACTIVE`|`HOLD`|`DRY_RUN`), and `phase`.
- SHALL require linked approved `DG-RCPT-*` disposition receipt.
- SHALL verify that all target paths belong strictly to the approved `namedPaths[]` allowlist from Mission DG.
- SHALL DENY destructive hard-delete flags, mass prune, unsupervised execution, Law VI secrets, Fundacion targets (`FUNDACION_ALWAYS_DENY`), PRODUCTION_READY flip, tip-pin rewrite, L29 reopen, and L30 auto-close.

### Requirement: Port Facade & Reversible Execution

The system MUST execute non-destructive soft quarantine.
- SHALL expose `govern(plan)`, `evaluate(plan)`, `getDecision(planId)`, and `verifyTrail(receipt)`.
- SHALL relocate approved files to an isolated quarantine directory while capturing individual file SHA-256 hashes.
- SHALL map `ACTIVE` + valid DG linkage + successful relocation to `PASS` with sealed receipt.
- SHALL map `HOLD` to `HOLD` with zero disk mutations.
- SHALL NOT rewrite tip pins, auto-close L30, or reopen L29.

## Non-Claims

≠ destructive delete ≠ hard purge (`rm -rf`) ≠ mass prune ≠ unsupervised delete ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠ Fundacion write ≠ GHE ≠ L30 auto-close ≠ L29 reopen ≠ CloudAgent.
Quarantine execution is reversible isolation only; zero data destruction.
