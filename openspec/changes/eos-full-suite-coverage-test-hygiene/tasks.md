# Tasks — Full-Suite Coverage & Test Hygiene

- [x] RED: `test:mission-bi` BI7 failing on `main`; GREEN: CT gate regex without literal prefix
- [x] Isolate dossier save test (temp `reportsDir`) and MCP audit test (restore `EVD-0060.json`)
- [x] RED: TR-06/TR-07/TR-08; GREEN: `includeExcluded` + `--full` + `test:full` + CI step + GHA contract assertion
- [x] `npm test` 1455/1455 PASS; `npm run test:full` 4186 PASS / 0 FAIL / 14 env-gated SKIP; tree clean after both
- [x] `verify:strict` 913/913 (same count as `main`); `eos:doctor` PASS; `node --check` all JS
- [ ] Owner: restore GitHub Actions billing so CI executes again
