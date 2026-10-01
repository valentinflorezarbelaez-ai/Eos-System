# Design — CI Suite Execution Honesty

## Invariants enforced by `scripts/lib/ci-suite-reachability-lock.js`

1. **Reachability.** Every `tests/**/*.test.js` is executed by at least one declared gate:
   slim discovery (`npm test`), an explicit `tests/...` reference in a workflow-invoked npm
   script (expanded recursively through `npm run` chains), or a full-corpus runner
   invocation (`scripts/test-runner.js --full`).
2. **Script reference integrity.** Every `tests/...` path referenced by any package.json
   script resolves on disk.
3. **No folded `run:` scalars.** A workflow `run:` plain scalar must stay single-line; a
   more-indented continuation line means YAML folds the next command into the previous one.
   Block scalars (`run: |`, `run: >`) are the supported way to list commands.

The lock is read-only, uses Node built-ins only (L0 purity), and reads
`SLIM_SUITE_EXCLUDES` directly from `scripts/test-runner.js` so the runner remains the
single source of truth.

## Scenarios (Given/When/Then)

- **Given** a suite listed in `SLIM_SUITE_EXCLUDES`, **when** no workflow-invoked script
  references it and no gate runs the full corpus, **then** `verify:strict` and GHA-009 fail
  with the offending suite names.
- **Given** a package.json script referencing a missing `tests/...` file, **when** the lock
  runs, **then** it fails naming the script and the dangling path.
- **Given** a workflow step whose `run:` plain scalar continues onto a more-indented line,
  **when** the lock runs, **then** it fails and reports which command is being appended
  instead of executed (GHA-011 covers both the folded and the block-scalar form).
- **Given** the repaired tree, **when** `verify:strict` runs, **then** it reports 923 checks
  and 0 failures, and **when** `npm run test:full` runs, **then** 320 suites execute with 0
  failures in ~12s.

## Why a lock instead of a longer workflow list

The enumerated per-ladder `npm run` list in `ci.yml` is exactly what rotted: it stopped at
Ladder 21 and nothing detected the omission for 20 ladders. One full-corpus job plus a
fail-closed invariant is the smaller construct (Ponytail Tier 2 — single pure audit
function) and it keeps working as ladders are added.

## Non-claims

Green `verify:strict` / `test:full` ≠ GitHub Actions green (still `BILLING_BLOCKED`) ≠
`PRODUCTION_READY` ≠ ladder closure. Reachability means "a declared gate executes the
suite", not "the suite is sufficient".
