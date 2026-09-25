# Design — Mission EG Long-Running Process Timeout Compensation

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`EG-RCPT-*`); freeze soft-observe `73252208` (`tipRewriteRefused`, `l35AutoCloseRefused`, `unsupervisedCompensateRefused`, `schemaJsonAddRefused`); compensationHold marks hermetic in-memory / unsupervised compensate refused / live saga rewrite refused / network write refused / tip rewrite refused / schema-json add refused / compensate fail-closed / governed seal only.
2. **Policy gate** — fail-closed preconditions; `compensation` must carry `processId` + `timeoutReason` + `compensationPlan`; optional `relatedDeadlineReceiptId` / `observedTimedOut`; PASS seals hermetic receipt; COMPENSATE (observedTimedOut) seals fail-closed hermetic; DENY for unsupervised compensate / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L34 reopen / L35 auto-close / mass prune / secrets / Fundacion / network write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `compensationDigest` + `prevReceiptHash`; COMPENSATE / PASS seal hermetic only (≠ live saga rewrite ≠ unsupervised compensate); never flips PRODUCTION_READY; never mutates live saga state.

## Non-claims

COMPENSATE / PASS ≠ live saga rewrite ≠ unsupervised compensate ≠ tip-refresh ≠ PRODUCTION_READY. Soft-observe ≠ tip rewrite. Mission EG ≠ L35 closeout. Tip-refresh post-EG is SEPARATE next.
