# Spec — SPEC-0008 Phase 3 Worker Execution Custody

## Requirement

EOS compute worker Phase 3 MUST:

1. On `applyDiff` throw / mid-apply failure, invoke `rollbackDiff` and return `status: 'APPLY_FAILED_ROLLED_BACK'` (zero dirty residuals).
2. On successful COMPLETED, bind a tamper-evident EvidenceCustody verify receipt via `sealVerifyReceipt` with distinct `builder_id` and `verifier_id`.
3. Provide Tier-2 CLI `scripts/runners/eos-compute-worker-cli.js` accepting `--change=<changeId>`, reading OpenSpec tasks, validating write scope, running `executeComputeRun` with real git rollback on breach, exiting 0 only on green verification.
4. MUST NOT mutate `src/core` (import custody APIs only).
5. MUST keep `PRODUCTION_READY=NO`, Fundacion Δ=0, AT_CEILING.

## Scenario — partial-apply atomic rollback

GIVEN `applyDiff` throws after partial writes
WHEN `executeComputeRun` handles the failure
THEN `rollbackDiff` is invoked
AND result.status is `APPLY_FAILED_ROLLED_BACK`
AND result.ok is false
AND no dirty residuals remain after rollback

## Scenario — COMPLETED seals custody receipt

GIVEN in-scope apply succeeds
AND verifier returns ok
AND distinct builder_id / verifier_id
WHEN `executeComputeRun` completes
THEN result.status is `COMPLETED`
AND result.custodyReceipt is a sealed VERIFY_RECEIPT event
AND builder_id != verifier_id on the receipt payload

## Scenario — CLI fail-closed exit

GIVEN `--change=<changeId>` with in-scope tasks
AND verifier fails or apply fails
WHEN the CLI runner finishes
THEN process exit code is non-zero
AND git rollback was attempted for planned writes on breach
