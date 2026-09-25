# Design — Mission DZ Process Manager / Saga Orchestration Port

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`DZ-RCPT-*`); freeze soft-observe `b382d29b` (`tipRewriteRefused`, `l34AutoCloseRefused`, `dualWriteRefused`, `outboxMutationRefused`); sagaHold marks hermetic in-memory / compensate fail-closed / network write refused.
2. **Policy gate** — fail-closed preconditions; `processInstance` must carry `processId` + `processType` + `step` + `triggerEvent` (`eventType` + `aggregateId` + non-empty `payload`); optional `compensationPlan`; refuse dual-write / outbox mutation / schema-json add / tip rewrite / PR flip / GHE / L30–L33 reopen / L34 auto-close / mass prune / secrets / Fundacion / network write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `processDigest` + `prevReceiptHash`; COMPENSATE/DENY fail-closed hermetic in-memory; never flips PRODUCTION_READY.

## Non-claims

PASS ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY. Soft-observe ≠ tip rewrite. Mission DZ ≠ L34 closeout. Tip-refresh post-DZ is SEPARATE next.
