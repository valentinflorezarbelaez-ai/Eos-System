# Tasks — Mission BJ (SPEC-0067) DAG

## T1 — Receipt module
- **done-criteria:** `src/core/observability/operator-dashboard-receipt.js` exports `stableStringify`, `sha256Canonical`, `buildDashboardReceipt`, `verifyDashboardReceipt`, `BJ_PRODUCTION_READY='NO'`, ids `BJ-RCPT-*`.

## T2 — Policy gate
- **done-criteria:** `operator-dashboard-policy-gate.js` fail-closes schema, freshness, integrity, Fundacion, malformed/empty, missing/stale/mismatched surface, provider throw.

## T3 — HUD fabric facade
- **done-criteria:** `operator-dashboard-hud-fabric.js` implements `registerSurface` + `generateSnapshot` + `renderTextSummary` + injectable ports + health NON-CLAIM / never-reopen / BH+BI MEASURED markers.

## T4 — Hermetic tests
- **done-criteria:** `tests/eos-bj-operator-dashboard-hud-fabric.test.js` includes brief's 5 + Law VI / PR=NO / NON-CLAIM / never-reopen / Fundacion / empty-malformed / deterministic / getState / BH+BI MEASURED; all PASS `node --test`.

## T5 — Patcher
- **done-criteria:** `scripts/patch-mission-bj.mjs` adds `test:mission-bj` (+ `test:operator-dashboard-hud`) and SLIM exclude `eos-bj-operator-dashboard-hud-fabric.test.js` (CRLF-safe).

## T6 — OpenSpec + ADR + evidence + release
- **done-criteria:** change folder complete; ADR-0026 with ≥3 rejected alts; EVD doc; release note; BOX_GREEN; bootstrap PS1.

## T7 — Box green + pack
- **done-criteria:** tests 16/16 PASS on box; Law VI CLEAN; `Eos-mission-bj-payload.tgz` + `MISSION_BJ_BOOTSTRAP.ps1` under `/workspace`. No CopyFromBox / no push from box.
