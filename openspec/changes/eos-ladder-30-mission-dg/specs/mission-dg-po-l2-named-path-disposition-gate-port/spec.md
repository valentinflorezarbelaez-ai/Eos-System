# Spec — Mission DG PO Level-2 Named-Path Disposition Gate Port (SPEC-0116)

## Purpose

Governed Layer-0 PO Level-2 named-path disposition gate port under freeze NON-CLAIM soft-observe, sealing `DG-RCPT-*` receipts with PASS|DENY|HOLD. PASS = disposition gated with named paths sealed, NOT delete execution.

## Requirements

### Receipt

- SHALL seal nine canonical fields with sha256 via `node:crypto`
- SHALL prefix receipt IDs with `DG-RCPT-`
- SHALL force `productionReady=NO` and `fundacionDelta=0`
- SHALL attach freeze soft-observe with pin `31f811ca` / `readOnly=true` / `deleteAuthRefused=true` / `autoApproveRefused=true`
- SHALL attach ceilingHold with `schemasAtCeiling=true` / `slimHold=true`
- SHALL attach `namedPaths[]` allowlist

### Policy gate

- SHALL require `planId`, `changeId`, `dispositionMode|remeasureMode|aggregationMode|honestyMode|ritualMode` (ACTIVE|HOLD), and phase
- SHALL require non-empty `namedPaths` when dispositionMode is ACTIVE
- SHALL require observedSurfaces covering DF_REMEASURE+ADR_0075_HITL+AP_HITL unless ackMissingObserveSurfaces
- SHALL DENY Fundacion targets, secrets (Law VI), PRODUCTION_READY flip, tip-pin rewrite, L29 reopen, GHE, auto-close L30, delete-auth, mass-prune, unsupervised delete, auto-approve, empty namedPaths for ACTIVE, weaken ALWAYS_DENY, auto-seal, tampered digests

### Port

- SHALL expose `govern`, `evaluate`, `getDecision`, `verifyTrail`
- SHALL soft-observe freeze NON-CLAIM labels/fixtures (never rewrite tip pins)
- SHALL soft-import DF remeasure + ADR-0075/AP HITL observe when present; else builtin double
- SHALL soft-observe DF inventoryDigest when present
- SHALL map ACTIVE+namedPaths+ok→PASS, HOLD→HOLD, refuse→DENY
- SHALL NOT tip-refresh or rewrite tip pins or auto-close L30 or authorize/execute delete or auto-approve
- SHALL NOT reopen L29; SHALL hold schemas AT_CEILING 35/35
- PASS SHALL mean disposition gated with named paths sealed ≠ delete execution (DH later)

## NON-CLAIMS

≠ unsupervised delete ≠ mass prune ≠ auto-approve deletes ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠ Fundacion write ≠ GHE ≠ L30 auto-close ≠ L29 reopen ≠ CloudAgent ≠ delete execution
Inventory/plan ≠ delete auth; gate ≠ execution (DH later)
