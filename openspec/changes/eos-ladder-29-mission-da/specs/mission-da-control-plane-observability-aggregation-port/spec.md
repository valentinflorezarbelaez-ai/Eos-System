# Spec — Mission DA Control-Plane Observability Aggregation Port (SPEC-0110)

## Purpose

Governed Layer-0 control-plane observability aggregation port under freeze NON-CLAIM soft-observe, sealing `DA-RCPT-*` receipts with PASS|DENY|HOLD.

## Requirements

### Receipt

- SHALL seal nine canonical fields with sha256 via `node:crypto`
- SHALL prefix receipt IDs with `DA-RCPT-`
- SHALL force `productionReady=NO` and `fundacionDelta=0`
- SHALL attach freeze soft-observe with pin `2d6ab2d2` / `readOnly=true`

### Policy gate

- SHALL require `planId`, `changeId`, `aggregationMode|honestyMode|ritualMode` (ACTIVE|HOLD), and phase
- SHALL require observedPorts covering CV+CW+CX+CY unless ackMissingObserveLabels
- SHALL DENY Fundacion targets, secrets (Law VI), PRODUCTION_READY flip, tip-pin rewrite, L28 reopen, GHE, auto-close L29, external APM, weaken ALWAYS_DENY, auto-seal, tampered digests

### Port

- SHALL expose `govern`, `evaluate`, `getDecision`, `verifyTrail`
- SHALL soft-observe freeze NON-CLAIM labels/fixtures (never rewrite tip pins)
- SHALL soft-import CV/CW/CX/CY honesty when present; else builtin double
- SHALL map ACTIVE+ok→PASS, HOLD→HOLD, refuse→DENY
- SHALL NOT tip-refresh or rewrite tip pins or auto-close L29

## NON-CLAIMS

≠ PRODUCTION_READY flip / ≠ tip-pin rewrite / ≠ Fundacion write / ≠ GHE / ≠ L29 auto-close / ≠ L28 reopen / ≠ external APM
