# Spec — Mission DF Complexity Inventory Remeasure Port (SPEC-0115)

## Purpose

Governed Layer-0 complexity inventory re-measure & ceiling hold port under freeze NON-CLAIM soft-observe, sealing `DF-RCPT-*` receipts with PASS|DENY|HOLD. PASS = re-measure+hold sealed, NOT delete authorization.

## Requirements

### Receipt

- SHALL seal nine canonical fields with sha256 via `node:crypto`
- SHALL prefix receipt IDs with `DF-RCPT-`
- SHALL force `productionReady=NO` and `fundacionDelta=0`
- SHALL attach freeze soft-observe with pin `36c99107` / `readOnly=true` / `deleteAuthRefused=true`
- SHALL attach ceilingHold with `schemasAtCeiling=true` / `slimHold=true`

### Policy gate

- SHALL require `planId`, `changeId`, `remeasureMode|aggregationMode|honestyMode|ritualMode` (ACTIVE|HOLD), and phase
- SHALL require observedSurfaces covering POST_L26_INVENTORY+ADR_0075_PRUNE_PLAN+T6_CEILING_HOLD unless ackMissingObserveSurfaces
- SHALL DENY Fundacion targets, secrets (Law VI), PRODUCTION_READY flip, tip-pin rewrite, L29 reopen, GHE, auto-close L30, delete-auth, mass-prune, unsupervised delete, weaken ALWAYS_DENY, auto-seal, tampered digests

### Port

- SHALL expose `govern`, `evaluate`, `getDecision`, `verifyTrail`
- SHALL soft-observe freeze NON-CLAIM labels/fixtures (never rewrite tip pins)
- SHALL soft-import ceiling surfaces when present; else builtin double
- SHALL map ACTIVE+ok→PASS, HOLD→HOLD, refuse→DENY
- SHALL NOT tip-refresh or rewrite tip pins or auto-close L30 or authorize delete
- SHALL NOT reopen L29; SHALL hold schemas AT_CEILING 35/35

## NON-CLAIMS

≠ delete authorization ≠ mass prune ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠ Fundacion write ≠ GHE ≠ L30 auto-close ≠ L29 reopen ≠ unsupervised delete
Inventory/plan ≠ delete auth (ADR-0075 / Post-L26 A)
