# Tasks — Operator HUD SSOT

## TASK-01 — HUD aggregator + CLI

- [x] RED: `tests/operator-hud.test.js` fails (module missing / behavior absent)
- [x] GREEN: `src/core/observability/operator-hud.js` + `bin/eos-hud.js` + `bin/eos-top.js`
- [x] TRIANGULATE: fail report, missing mission, snapshot write, slogan refuse
- [x] Docs: operator manual section + `package.json` scripts
- [x] `verify-eos` REQUIRED_PATHS include HUD module and bins

Evidence command: `node --test tests/operator-hud.test.js`
