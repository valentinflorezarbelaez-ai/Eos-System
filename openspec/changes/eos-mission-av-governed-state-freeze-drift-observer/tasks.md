# Tasks — Mission AV Governed State Freeze & Drift Observer (SPEC-0053)

- [x] `src/core/freeze-drift/tip-pin-reader.js` — parse main_tip / evaluated_tip
- [x] `src/core/freeze-drift/drift-receipt.js` — sealed MATCHED | DRIFT | DENY receipt
- [x] `src/core/freeze-drift/honesty-gate.js` — fail-closed honesty DENY
- [x] `src/core/freeze-drift/governed-state-freeze-drift-observer.js` — main observer
- [x] `tests/eos-av-governed-state-freeze-drift-observer.test.js` — AV1–AV20 hermetic
- [x] `scripts/patch-mission-av.mjs` — scripts + SLIM_SUITE_EXCLUDES
- [x] OpenSpec change + release doc + bootstrap + PACKAGE_SCRIPTS_NOTE
- [x] Box-green: node --test, node --check
- [ ] Host: MISSION_AV_BOOTSTRAP.ps1 (Antigravity-first; not run in box)
