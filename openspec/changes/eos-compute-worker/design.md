# Design — eos-compute-worker (SPEC-0008)

## Architecture (Tier 2 pure helpers)

Runner module exports pure / injectable functions (no global FS mutation in unit path):

| Function | Role |
| --- | --- |
| `parseCheckboxTasks(md)` | Parse `- [ ]` / `- [x]` lines from `openspec/changes/*/tasks.md` |
| `assertWritePathsInScope(paths, policy)` | Fail-closed reject outside allow roots |
| `buildComputePlan({ changeId, tasks, contextPackPath, builderId, verifierId })` | BUILDER plan; asserts BUILDER != VERIFIER |
| `executeComputeRun({ plan, applyDiff, runVerifier, rollbackDiff })` | Apply → VERIFIER child → rollback on breach |

## Context

Operators/agents load Tool/Prompt/Context via `docs/harness/CONTEXT_PACK_TPC.md` (SSOT index). Worker records `contextPackPath` on the plan; it does not invent a parallel context OS.

## Write scope (fail-closed)

Default allow roots relative to repo root:

- `openspec/changes/<changeId>/`
- `scripts/runners/`
- `tests/runners/`

Any planned write outside → `OUT_OF_SCOPE_WRITE` (no apply).

## BUILDER != VERIFIER

- Worker identity = BUILDER (produces/applies diff).
- Verifier identity = distinct child process runner for `npm test` + `npm run verify:strict`.
- Uses same disjunction spirit as Ladder 10 V5 / ADR-0010; runner may call `assertBuilderVerifierDisjunction` when IDs present.

## Rollback

If verifier returns non-zero / `ok:false`, call `rollbackDiff` and return `status: 'ROLLED_BACK'` with `PRODUCTION_READY: 'NO'`. Never claim success on breach.

## L0 purity

No new modules under `src/core`. Runner lives under `scripts/runners/`.

## Invariants

AT_CEILING; PRODUCTION_READY=NO; Fundacion Δ=0.
