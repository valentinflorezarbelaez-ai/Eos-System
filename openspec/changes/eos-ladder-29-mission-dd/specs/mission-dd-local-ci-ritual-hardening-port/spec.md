# Spec — Mission DD Local CI Ritual Hardening Port (SPEC-0113)

## Purpose

Governed Layer-0 Local CI Ritual Hardening port under freeze NON-CLAIM soft-observe, sealing `DD-RCPT-*` receipts with PASS|DENY|HOLD.

## Requirements

### Receipt

- SHALL seal nine canonical fields with sha256 via `node:crypto`
- SHALL prefix receipt IDs with `DD-RCPT-`
- SHALL force `productionReady=NO` and `fundacionDelta=0`
- SHALL attach freeze soft-observe with pin `4d8c6c59` / `readOnly=true`

### Policy gate

- SHALL require `planId`, `changeId`, `custodyMode|ritualMode|honestyMode|aggregationMode` (ACTIVE|HOLD), and phase
- SHALL require observedPorts covering DA **and** DB unless ackMissingObserveLabels
- SHALL DENY Fundacion targets, secrets (Law VI), PRODUCTION_READY flip, tip-pin rewrite, L28 reopen, GHE, auto-close L29, external APM, weaken ALWAYS_DENY, auto-seal, tampered digests

### Port

- SHALL expose `govern`, `evaluate`, `getDecision`, `verifyTrail`
- SHALL soft-observe freeze NON-CLAIM labels/fixtures (never rewrite tip pins)
- SHALL soft-compose DA+DB+DC observe when present; else builtin double
- SHALL soft-observe L28 CV–CY/CX billing-blocked honesty when present
- SHALL map ACTIVE+ok→PASS, HOLD→HOLD, refuse→DENY
- SHALL NOT tip-refresh or rewrite tip pins or auto-close L29 or reopen L28

## NON-CLAIMS

≠ PRODUCTION_READY flip / ≠ tip-pin rewrite / ≠ Fundacion write / ≠ GHE / ≠ GHA green / ≠ L29 auto-close / ≠ L28 reopen / ≠ external APM
