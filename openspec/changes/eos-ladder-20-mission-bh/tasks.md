# Tasks — Mission BH (SPEC-0065) DAG

## T1 — Receipt module
- **done-criteria:** `src/core/mission/mission-transition-receipt.js` exports `stableStringify`, `sha256Canonical`, `buildTransitionReceipt`, `verifyTransitionReceipt`, `BH_PRODUCTION_READY='NO'`, ids `BH-RCPT-*`.

## T2 — Policy gate
- **done-criteria:** `mission-lifecycle-policy-gate.js` fail-closes illegal transition, missing evidenceHash, terminal CLOSED, malformed, empty missionId.

## T3 — State machine facade
- **done-criteria:** `mission-lifecycle-state-machine.js` implements FSM + `transition` + `getHistory` + chain `prevReceiptHash` + health NON-CLAIM / never-reopen markers.

## T4 — Hermetic tests
- **done-criteria:** `tests/eos-bh-mission-lifecycle-state-machine.test.js` ≥5 required scenarios + Law VI / PR=NO / NON-CLAIM / never-reopen / terminal / deterministic / getHistory / empty-malformed; all PASS `node --test`.

## T5 — Patcher
- **done-criteria:** `scripts/patch-mission-bh.mjs` adds `test:mission-bh` (+ `test:mission-lifecycle`) and SLIM exclude `eos-bh-mission-lifecycle-state-machine.test.js` (CRLF-safe).

## T6 — OpenSpec + ADR + evidence + release
- **done-criteria:** change folder complete; ADR-0024 with ≥3 rejected alts; EVD doc; release note; BOX_GREEN; bootstrap PS1.

## T7 — Box green + pack
- **done-criteria:** tests 16/16 PASS on box; Law VI CLEAN; `Eos-mission-bh-payload.tgz` + `MISSION_BH_BOOTSTRAP.ps1` under `/workspace`. No CopyFromBox / no push from box.
