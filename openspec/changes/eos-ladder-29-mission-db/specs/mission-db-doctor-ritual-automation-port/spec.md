# Spec — Mission DB Doctor Ritual Automation Port (SPEC-0111)

## Purpose

Governed Layer-0 Doctor Ritual Automation port under freeze NON-CLAIM soft-observe, sealing `DB-RCPT-*` receipts with PASS|DENY|HOLD.

## Requirements

### Receipt

- SHALL seal nine canonical fields with sha256 via `node:crypto`
- SHALL prefix receipt IDs with `DB-RCPT-`
- SHALL force `productionReady=NO` and `fundacionDelta=0`
- SHALL attach freeze soft-observe with pin `daae7380` / `readOnly=true`

### Policy gate

- SHALL require `planId`, `changeId`, `ritualMode|honestyMode|aggregationMode` (ACTIVE|HOLD), and phase
- SHALL require observedPorts covering DA unless ackMissingObserveLabels
- SHALL DENY Fundacion targets, secrets (Law VI), PRODUCTION_READY flip, tip-pin rewrite, L28 reopen, GHE, auto-close L29, external APM, weaken ALWAYS_DENY, auto-seal, tampered digests

### Port

- SHALL expose `govern`, `evaluate`, `getDecision`, `verifyTrail`
- SHALL soft-observe freeze NON-CLAIM labels/fixtures (never rewrite tip pins)
- SHALL soft-compose DA observability observe when present; else builtin double
- SHALL soft-observe L28 honesty labels (CV/CW/CX/CY) when present
- SHALL map ACTIVE+ok→PASS, HOLD→HOLD, refuse→DENY
- SHALL NOT tip-refresh or rewrite tip pins or auto-close L29 or reopen L28

## NON-CLAIMS

≠ PRODUCTION_READY flip / ≠ tip-pin rewrite / ≠ Fundacion write / ≠ GHE / ≠ L29 auto-close / ≠ L28 reopen / ≠ external APM
