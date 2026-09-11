# Spec — SPEC-0008 EOS Headless Compute Worker

## Requirement

EOS MUST provide a headless compute worker under `scripts/runners/eos-compute-worker.js` that:

1. Parses checkbox tasks from `openspec/changes/*/tasks.md` (`- [ ]` / `- [x]`).
2. Loads context authority via `CONTEXT_PACK_TPC.md` path recorded on the plan.
3. Acts as **BUILDER** (diff plan/apply) while a distinct **VERIFIER** child runs `npm test` and `npm run verify:strict`.
4. Fail-closed **rolls back** applied diffs when verifier checks fail.
5. **Rejects** planned writes outside the scoped allow roots.
6. MUST NOT place new runtime under `src/core` (L0 purity).
7. MUST keep `PRODUCTION_READY=NO`, Fundacion Δ=0, AT_CEILING.

## Scenario — happy path marks task done

GIVEN a pending OpenSpec task `- [ ] Implement helper`
AND planned writes are in-scope
AND verifier child returns ok
WHEN `executeComputeRun` completes
THEN result.status is `COMPLETED`
AND the task is represented as done (`[x]`)
AND no rollback is invoked

## Scenario — rollback on verifier breach

GIVEN in-scope apply succeeds
AND verifier child returns failure
WHEN `executeComputeRun` completes
THEN result.status is `ROLLED_BACK`
AND rollbackDiff was invoked
AND result.ok is false

## Scenario — reject out-of-scope writes

GIVEN a planned write path under `Fundacion/` or other non-allow root
WHEN `assertWritePathsInScope` / plan validation runs
THEN it fails closed with code `OUT_OF_SCOPE_WRITE`
AND no apply occurs
