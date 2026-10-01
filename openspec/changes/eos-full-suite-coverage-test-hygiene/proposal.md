# Proposal — Full-Suite Coverage, Test Hygiene & BI7 Regression Fix

## Why

Measured on `main` @ `8903b578` (2026-10-01):

- `scripts/test-runner.js` excludes 175 suites from `npm test` (`SLIM_SUITE_EXCLUDES`, driven by the TR-01 145-file ceiling). **123** of them are not reachable from any GitHub Actions step (every Ladder 22–41 satellite and seam pack, e.g. `test:mission-fh`, `test:mission-fi`). They only run if an operator remembers the per-mission npm script.
- `test:mission-bi` (BI7 Law VI MODULE_DIR scan) fails on `main`: Mission CT (#382) added a literal `ghp_` regex to `src/core/continuity/fundacion-delta0-continuity-policy-gate.js`. Nothing caught it because the suite is opt-in.
- GitHub Actions has not executed a job on `main` for at least the last 60 runs ("recent account payments have failed"), so local verification is the only gate in practice.
- `npm test` leaves a dirty tree: `executive-dossier-engine.test.js` rewrites `docs/reports/executive/EXECUTIVE_DOSSIER_PRJ-APP-FUERZA.md` and `mcp-native-operator-tools.test.js` re-seals `docs/evidence/EVD-0060.json`.

## What changes

- `discoverTestFiles(dir, suffix, { includeExcluded })` + `--full` runner flag + `npm run test:full` (slim `npm test` and the TR-01 ceiling are unchanged).
- CI `test` job runs `npm run test:full`; `assert-gha-contract.js` requires it.
- TR-06 (no stale excludes), TR-07 (full = slim + excludes), TR-08 (script + CI wiring).
- CT policy gate uses `/gh[p]_…/` (same matches, no literal prefix in source).
- Dossier save test writes to a temp dir; MCP audit test restores `EVD-0060.json`.

## Non-goals

- Restoring GitHub Actions billing (owner action).
- Changing `SLIM_SUITE_EXCLUDES` membership or the TR-01 ceiling.
- Ladder/tip-pin/freeze document edits; Fundacion writes; PRODUCTION_READY flip.
