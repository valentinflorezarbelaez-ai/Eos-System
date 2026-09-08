# ROI5 Long-Run GameDay 2026-09-08

Branch: cursor/roi5-long-run-gameday
Base: c5372e9
Scope: ROI5 ONLY
PRODUCTION_READY: NO

## Goal
CI-safe long-run GameDay harness for Mission Loop + Write Barrier + Evidence Custody. Fail-closed. Fundacion delta=0. No ROI2 restore.

## Design
src/core/adversarial/long-run-gameday-harness.js + scripts/ci/long-run-gameday.js. Default N=25. Opt-in --soak/--iterations. Fault catalog: happy, tool fail, barrier deny, Fundacion deny, custody tamper, false success, loop skip, blast B7.

## Deliverables
harness, CLI, tests/roi5-long-run-gameday.test.js, gameday:long-run + test:roi5 scripts, this doc.

## Verify
npm run test:roi5
npm run gameday:long-run
npm run verify:strict

## Freeze
No ROI6. No merge. PRODUCTION_READY=NO. Fundacion delta=0. DEFER dirty. Soak opt-in. No ADR.
