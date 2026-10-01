# Tasks — CI Suite Execution Honesty

- [x] Measure the gap (`123/320` unreachable suites, folded verify step, 2 dangling script refs) — evidence: `docs/audits/CI_SUITE_EXECUTION_HONESTY_AUDIT_2026-10-01.md`
- [x] Fix masked BI7 defect in `src/core/continuity/fundacion-delta0-continuity-policy-gate.js` — evidence: `npm run test:mission-bi` 16/16 PASS, `npm run test:mission-ct` 19/19 PASS
- [x] Unfold the `verify` job step in `.github/workflows/ci.yml` — evidence: `node scripts/ci/assert-gha-contract.js` VERIFIED
- [x] Add `--full` to `scripts/test-runner.js` + `test:full` script (slim discovery unchanged at 145) — evidence: `npm run test:full` 320 suites / 4201 tests / 0 fail
- [x] Add `full-suite` job to `ci.yml` + `docs/governance/CI_CD_CONTRACT.json` + contract assertion — evidence: `node --test tests/github-actions-cicd.test.js` 12/12 PASS
- [x] Repair `test:du` and `test:security` references — evidence: `npm run test:du` 17/17 PASS, `npm run test:security` 49/49 PASS
- [x] Add `scripts/lib/ci-suite-reachability-lock.js` + GHA-009…GHA-012 + `verify-eos` wiring — evidence: `npm run verify:strict` 923 checks / 0 failures
- [ ] PR review + merge — do NOT rewrite freeze tip pins; no `PRODUCTION_READY` flip; GHA stays BILLING_BLOCKED
