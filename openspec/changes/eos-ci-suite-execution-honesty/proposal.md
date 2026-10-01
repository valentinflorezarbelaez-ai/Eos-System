# Proposal — CI Suite Execution Honesty

## Why

The harness declared more verification than it performed on `main@8903b578`:

- the `verify` job's strict-verification step folded 29 `npm run test:*` lines into argv of
  `verify-eos.js`, so those satellite suites never executed;
- 123 of 320 suites were excluded from `npm test` with no workflow gate invoking them;
- `npm run test:mission-bi` failed (BI7 Law VI MODULE_DIR CLEAN) behind that gap;
- `test:du` and `test:security` referenced test files that do not exist.

With GitHub Actions `BILLING_BLOCKED`, `verify:strict` plus the local corpus are the real
gates, so silent non-execution reads as evidence while producing none.

## What changes

- `src/core/continuity/fundacion-delta0-continuity-policy-gate.js` composes the GitHub PAT
  prefix at runtime (identical matching; no contiguous provider literal under
  `src/core/continuity/`).
- `.github/workflows/ci.yml` moves the folded commands into a block-scalar step and gains a
  `full-suite` job running `npm run test:full`; the job is declared in
  `docs/governance/CI_CD_CONTRACT.json` and asserted by `scripts/ci/assert-gha-contract.js`.
- `scripts/test-runner.js` accepts `--full` / `--include-excluded` to include
  `SLIM_SUITE_EXCLUDES`; default slim discovery is unchanged (TR-01 ≤145).
- `package.json` adds `test:full`, repoints `test:du` at `eos-du-domain-event-publisher-port.test.js`
  and `test:security` at the existing Law VI / secret-zero / adversarial-bypass / write-barrier suites.
- `scripts/lib/ci-suite-reachability-lock.js` (new) is wired into `verify-eos --strict` and
  `tests/github-actions-cicd.test.js` (GHA-009…GHA-012), fail-closed on unreachable suites,
  dangling script references, and folded `run:` scalars.

## Non-goals

- Raising the TR-01 slim ceiling; deleting suites or scripts; rewriting freeze tip pins;
  flipping `PRODUCTION_READY`; adding `docs/schemas/**/*.json`; Fundacion writes; claiming
  GitHub Actions green; implementing Ladder 41 satellites FJ–FM; CloudAgent claims.

## Routing

DIRECT execution with recorded evidence (ADR-0010): harness defect repair under
`scripts/`, `.github/`, `tests/`, plus one surgical `src/core/continuity` line that an
existing failing test already specified. ADR-0160 records the decision; SSOT index
`docs/base-standards.md`.

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| Law VI | held — provider prefix composed, never embedded; no secrets sealed |
| Schemas | AT_CEILING 35/35 (none added) |
| Freeze pin | not rewritten (soft-observe only) |
| Ladders | L17–L40 CLOSED retained; L41 OPEN (FI MEASURED; FJ–FM pending) |
| GitHub Actions | BILLING_BLOCKED — local gates only; PASS ≠ GHA green |
