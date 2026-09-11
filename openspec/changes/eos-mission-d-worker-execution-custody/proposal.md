# Proposal — Mission D: Worker Execution Atomicity, Custody Sealing & CLI

## Why

SPEC-0008 Phase 2 left `applyDiff` throw as `APPLY_FAILED` without rollback (adversarial suite documented). Fail-closed atomicity requires partial-apply residuals to be rolled back. Ladder 10 V5 / ADR-0015 also requires COMPLETED runs to bind a tamper-evident EvidenceCustody verify receipt with distinct `builder_id` / `verifier_id`. Operators need a Tier-2 CLI to drive the worker against OpenSpec changes with real git rollback.

## What (this change)

1. OpenSpec change envelope `openspec/changes/eos-mission-d-worker-execution-custody/`.
2. Atomic partial-apply rollback in `scripts/runners/eos-compute-worker.js`:
   - On `applyDiff` throw / mid-apply failure → call `rollbackDiff` → `status: 'APPLY_FAILED_ROLLED_BACK'` (zero dirty residuals).
3. Evidence custody binding on COMPLETED via existing `EvidenceCustody.sealVerifyReceipt` (import only; no `src/core` mutation).
4. Tier-2 CLI `scripts/runners/eos-compute-worker-cli.js` (`--change=<changeId>`, tasks.md, `assertWritePathsInScope`, real git rollback, fail-closed exit codes).
5. Tests under `tests/runners/` + wire `npm run test:compute-worker`; new `*.test.js` basenames in `SLIM_SUITE_EXCLUDES` (TR-01 ≤145).

## Definition of Done

- Branch `grok/mission-d-worker-execution-custody` from origin/main (~db10bd3 / #109).
- `npm run test:compute-worker` ALL PASS; `npm run test:v5` ALL PASS; slim ≤145; `npm run verify:strict` EXIT 0 (914+).
- Conventional commit without AI attribution; branch pushed; **no PR**.
- `PRODUCTION_READY=NO`; Fundacion Δ=0; AT_CEILING; V5 invariant not weakened.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- PRODUCTION_READY flip
- Fundacion / App Fuerza mutation
- Cursor CloudAgent
- Mutating `src/core`
- New npm dependencies / JSON schemas
- Opening or merging a PR (parent HITL)
