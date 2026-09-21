# Spec — Mission CY Mission OS / Control-Plane L0 Residual Honesty Port (SPEC-0108)

## Purpose

Governed Layer-0 residual honesty port for Mission OS / control-plane composition under freeze NON-CLAIM soft-observe, sealing `CY-RCPT-*` receipts with PASS|DENY|HOLD.

## Requirements

### Receipt

- SHALL seal nine canonical fields with sha256 via `node:crypto`
- SHALL prefix receipt IDs with `CY-RCPT-`
- SHALL force `productionReady=NO` and `fundacionDelta=0`
- SHALL attach freeze soft-observe with pin `487a38bf` / `readOnly=true`

### Policy gate

- SHALL require `planId`, `changeId`, `honestyMode|ritualMode` (ACTIVE|HOLD), and phase
- SHALL require observedPorts covering CV+CW+CX unless ackMissingObserveLabels
- SHALL DENY Fundacion targets, secrets (Law VI), PRODUCTION_READY flip, tip-pin rewrite, L27 reopen, GHE, auto-close L28, CZ start, weaken ALWAYS_DENY, auto-seal, tampered digests

### Port

- SHALL expose `govern`, `evaluate`, `getDecision`, `verifyTrail`
- SHALL soft-observe freeze NON-CLAIM labels/fixtures (never rewrite tip pins)
- SHALL soft-import CV/CW/CX honesty when present; else builtin double
- SHALL map ACTIVE+ok→PASS, HOLD→HOLD, refuse→DENY
- SHALL NOT tip-refresh or start CZ

## NON-CLAIMS

≠ PRODUCTION_READY flip / ≠ tip-pin rewrite / ≠ Fundacion write / ≠ GHE / ≠ L28 auto-close / ≠ CZ start / ≠ L27 reopen
