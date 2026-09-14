# Tasks — Mission BI (SPEC-0066) DAG

## T1 — Receipt module
- **done-criteria:** `src/core/continuity/cross-session-continuity-receipt.js` exports `stableStringify`, `sha256Canonical`, `buildContinuityReceipt`, `verifyContinuityReceipt`, `BI_PRODUCTION_READY='NO'`, ids `BI-RCPT-*`.

## T2 — Policy gate
- **done-criteria:** `cross-session-continuity-policy-gate.js` fail-closes schema, checkpoint integrity, handoff validity, Fundacion, malformed/empty, missing/divergent checkpoint, replay divergence.

## T3 — Replay fabric facade
- **done-criteria:** `cross-session-continuity-replay-fabric.js` implements `captureCheckpoint` + `handoffSession` + `replaySessionHistory` + injectable ports + health NON-CLAIM / never-reopen / BH MEASURED markers.

## T4 — Hermetic tests
- **done-criteria:** `tests/eos-bi-cross-session-continuity-replay-fabric.test.js` includes brief's 5 + Law VI / PR=NO / NON-CLAIM / never-reopen / Fundacion / empty-malformed / deterministic / getState / BH MEASURED; all PASS `node --test`.

## T5 — Patcher
- **done-criteria:** `scripts/patch-mission-bi.mjs` adds `test:mission-bi` (+ `test:cross-session-continuity`) and SLIM exclude `eos-bi-cross-session-continuity-replay-fabric.test.js` (CRLF-safe).

## T6 — OpenSpec + ADR + evidence + release
- **done-criteria:** change folder complete; ADR-0025 with ≥3 rejected alts; EVD doc; release note; BOX_GREEN; bootstrap PS1.

## T7 — Box green + pack
- **done-criteria:** tests 16/16 PASS on box; Law VI CLEAN; `Eos-mission-bi-payload.tgz` + `MISSION_BI_BOOTSTRAP.ps1` under `/workspace`. No CopyFromBox / no push from box.
