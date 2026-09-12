# Proposal — Mission AS: Cross-Satellite Composition Harness (SPEC-0050)

## Why

Ladder 17 audit ranks **Cross-Satellite Composition Harness** as the first
L17 satellite (after L16 AN–AR CLOSED / MEASURED). AN/AO/AP/AQ are MEASURED
as isolated planes; there is no **composition harness** that observes/integrates
federation × failover × authority × export fail-closed — without claiming an
E2E product suite or PRODUCTION_READY integration platform.

## What

1. `src/core/composition/cross-satellite-composition-harness.js` —
   `createCrossSatelliteCompositionHarness`; kind
   `eos-cross-satellite-composition-harness`;
   `runScenario` / `composePlanes` / `getState` / `sealReceipt` /
   `advanceComposition` / `beginComposition` / `endComposition`;
   injectable `{ an, ao, ap, aq, now, hash }`;
   fail-closed `COMPOSITION_OK` / `PLANE_INCONSISTENT` /
   `COMPOSITION_DENIED` / `MISSING_DEP` / `INVALID_REQUEST` /
   `SECRET_LEAK_FORBIDDEN` / `EVD_LINK_FAIL` / `FUNDACION_DENIED` /
   `HITL_REQUIRED`; `AS_PRODUCTION_READY='NO'`.
2. Thin `composition-receipt.js` + `plane-stubs.js` — seal helpers +
   AN/AO/AP/AQ plane fakes (compose, don't rewrite).
3. Suite `tests/eos-as-cross-satellite-composition.test.js`
   (AS1–AS17) hermetic; **no static vendor-key prefix substring**
   (runtime synth); slim-exclude;
   `npm run test:cross-satellite-composition` / `test:mission-as`.
4. OpenSpec change + release report + bootstrap + idempotent patcher.

## DoD

Branch `grok/mission-as-cross-satellite-composition-harness` from main tip
starting with `3a7fb75` (StartsWith OK; WARN+continue on mismatch); tests
green (~14–18 PASS, 0 FAIL); SLIM≤145; verify:strict EXIT 0 on host;
PRODUCTION_READY=NO; Fundacion Δ=0; no AI commit attribution; no CloudAgent;
zero new npm deps; do NOT implement AT/AU/AV/AW; hermetic fakes only;
composition never claims E2E product suite.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- AT Operator Continuity / Crash-Recovery Custody Port
- AU Law VI Secret Runtime Broker / Env Gate
- AV Release Honesty / Freeze-Drift Observer
- AW Ladder 17 CI Seam-Pack + Closeout
- PRODUCTION_READY flip
- Real Fundacion writes
- E2E product suite / PRODUCTION_READY integration platform / CloudAgent orchestration
- Vendoring full AN–AQ module trees into AS
- Static vendor API key literals in source/tests
