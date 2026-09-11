# Proposal — Mission A: Worker + Custody Adversarial Fuzz

## Why

SPEC-0008 (`eos-compute-worker`) and Ladder 10 V5 custody must fail-closed under adversarial inputs: malformed OpenSpec checkbox markdown, unicode/invisible identity spoofing, path-traversal task/write paths, and verifier-child failure without dirty working-tree residuals.

## What (this change)

1. OpenSpec change envelope `openspec/changes/eos-mission-a-worker-custody-fuzz/`.
2. Fuzz suite `tests/runners/eos-compute-worker-fuzz.test.js` (TDD RED→GREEN):
   - `parseCheckboxTasks`: malformed markdown, unclosed checkboxes, unicode, path traversal → reject/sanitize fail-closed (no filesystem escape).
   - `assertBuilderVerifierDisjunction`: identical builder/verifier ids OR spoofed same token → fail-closed.
   - `executeComputeRun` rollback: child verify failure → working tree restored (no dirty residuals).
3. Minimal Tier-1/2 hardening in worker/custody **only where tests prove gaps**.
4. Wire fuzz file into `npm run test:compute-worker` (no new package.json dependencies).
5. Exclude fuzz from default slim discovery (`SLIM_SUITE_EXCLUDES`) so TR-01 ceiling stays 145 without weakening opt-in fuzz coverage.

## Definition of Done (Mission A)

- Branch `grok/mission-a-worker-custody-fuzz` from origin/main (~2d58d51 / #103+).
- OpenSpec FIRST artifacts present with checkbox tasks.
- Fuzz + existing compute-worker tests green; `npm run test:v5` green; `npm run verify:strict` EXIT 0 (914 checks).
- Conventional commit without AI attribution; branch pushed; **no PR**.
- `PRODUCTION_READY=NO`; Fundacion Δ=0; AT_CEILING; V5 invariant not weakened.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- PRODUCTION_READY flip
- Fundacion / App Fuerza mutation
- Cursor CloudAgent
- New JSON schemas (AT_CEILING 35/35)
- Opening or merging a PR (parent HITL)
- Weakening V5 BUILDER != VERIFIER production invariant
