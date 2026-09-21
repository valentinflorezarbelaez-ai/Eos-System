# Spec — Mission CV HUD/Doctor Honesty Ritual Composition Port (SPEC-0105)

## Purpose

Elevate post-L26 B Doctor/HUD honesty surfaces into a Layer-0 ritual composition port with sealed `CV-RCPT-*` receipts that compose honesty chips (freeze lag, dirty-defer, NON-CLAIM, pending-port) with optional CQ–CT observe labels — without claiming PRODUCTION_READY flip, L27 reopen, tip rewrite, or L28 closeout.

## Requirements

### Receipt
- SHALL seal nine canonical fields via SHA-256 into `CV-RCPT-*`
- SHALL attach ritualMode, honestyOk, freezeLagMeasured, dirtyDeferred, nonClaimChips, pendingPorts, cqCtObserveLabels
- SHALL keep `productionReady=NO` and `fundacionDelta=0`
- SHALL expose NON-CLAIMs: ≠ PRODUCTION_READY flip / ≠ L27 reopen / ≠ tip rewrite / ≠ L28 closeout / ≠ tip-refresh / ≠ CW

### Policy gate
- SHALL fail-closed on empty/malformed plans
- SHALL require planId + changeId + ritualMode (ACTIVE|HOLD) + ritualPhase + honesty input or ritualDigest
- SHALL DENY Fundacion targets/writes, secrets (Law VI), PRODUCTION_READY flip, auto-seal, L27 reopen, tip rewrite, weaken ALWAYS_DENY
- SHALL DENY dirty-without-ack and freeze-lag-unmeasured-without-ack

### Port
- SHALL implement `govern` / `evaluate` / `getDecision` / `verifyTrail`
- SHALL soft-import `doctor-hud-honesty.js` when co-located; else builtin double
- SHALL NOT wholesale-replace `operator-doctor.js` / `operator-hud.js`
- SHALL map ACTIVE+honesty ok → PASS; HOLD → HOLD; refuse → DENY
- SHALL treat CQ–CT observe as optional labels only (no live CQ–CT govern required for happy path)
- SHALL preserve FUNDACION_ALWAYS_DENY + human PRODUCTION_READY gate

### Tests
- SHALL ship ~16–20 hermetic node:test cases covering happy/HOLD/refuse matrix, soft-import, NON-CLAIMs, verifyTrail tamper, port green ≠ L28 closeout

### Host wiring
- SHALL provide CRLF-safe `scripts/patch-mission-cv.mjs` adding `test:mission-cv` / `test:hud-doctor-honesty-ritual` + SLIM exclude
- SHALL NOT tip-refresh / start CW from this package
- SHALL NOT add `docs/schemas/**/*.json` (AT_CEILING 35/35)

## NON-CLAIMS

HUD/Doctor Honesty Ritual Composition Port ≠ PRODUCTION_READY flip / ≠ L27 reopen / ≠ tip rewrite / ≠ GHE / ≠ L28 closeout / ≠ tip-refresh / ≠ CW.
