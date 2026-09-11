# Design — Mission D (SPEC-0008 Phase 3)

## Atomic partial-apply rollback

Previous Phase 2 behavior: `applyDiff` throw → `APPLY_FAILED` without `rollbackDiff` (adversarial suite locked that contract).

Phase 3 fail-closed atomicity:

1. `applyDiff` throws or fails midway (partial writes possible).
2. `executeComputeRun` MUST invoke `rollbackDiff({ plan, reason })` when provided.
3. Return `status: 'APPLY_FAILED_ROLLED_BACK'`, `ok: false`, `PRODUCTION_READY: 'NO'`.
4. Tasks remain pending (`[ ]`); zero dirty residuals after rollback.

Verifier-breach path unchanged: `ROLLED_BACK`.

## Evidence custody binding (ADR-0015 / V5)

On successful COMPLETED:

- Resolve `EvidenceCustody` (injectable for tests; default `.eos/custody` under control plane).
- Call `sealVerifyReceipt` with distinct `builder_id` / `verifier_id` (from plan), `status: 'COMPLETED'`, tamper-evident `receipt_hash` (SHA-256 over canonical payload).
- Attach sealed ledger event as `custodyReceipt` on the result.
- Seal failure → fail-closed (do not claim COMPLETED).

Import only from `src/core/sdd/evidence-custody.js` — no L0 rewrite.

## Tier-2 CLI

`scripts/runners/eos-compute-worker-cli.js`:

| Concern | Behavior |
| --- | --- |
| Args | `--change=<changeId>` required |
| Tasks | Read `openspec/changes/<changeId>/tasks.md` |
| Scope | `assertWritePathsInScope` on planned writes |
| Run | `executeComputeRun` with injectable deps |
| Rollback | Default: `git checkout -- <paths>` + `git clean -fd` on planned writes |
| Exit | 0 on COMPLETED; non-zero fail-closed on breach / apply fail / scope deny |

## L0 / invariants

No `src/core` mutation. No new npm deps. PRODUCTION_READY=NO. Fundacion Δ=0. AT_CEILING.
