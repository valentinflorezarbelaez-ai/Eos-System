# Tasks — Mission AU Law VI Secret Runtime Broker (SPEC-0052)

- [x] `src/core/secrets/env-gate.js` — allowlist env keys + adapters
- [x] `src/core/secrets/secret-leak-guard.js` — EVD/federation/repo DENY
- [x] `src/core/secrets/broker-receipt.js` — sealed receipt (no secret values)
- [x] `src/core/secrets/secret-runtime-broker.js` — main broker
- [x] `tests/eos-au-law-vi-secret-runtime-broker.test.js` — AU1–AU20 hermetic
- [x] `scripts/patch-mission-au.mjs` — scripts + SLIM_SUITE_EXCLUDES
- [x] OpenSpec change + release doc + bootstrap + PACKAGE_SCRIPTS_NOTE
- [x] Box-green: node --test, node --check, forbidden-prefix CLEAN
- [ ] Host: MISSION_AU_BOOTSTRAP.ps1 (Antigravity-first; not run in box)
