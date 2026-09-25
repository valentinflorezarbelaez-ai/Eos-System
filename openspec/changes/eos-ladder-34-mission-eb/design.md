# Design — Mission EB Dead-Letter Quarantine Port

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`EB-RCPT-*`); freeze soft-observe `037f9578` (`tipRewriteRefused`, `l34AutoCloseRefused`, `silentDropRefused`, `unsupervisedRetryRefused`); quarantineHold marks hermetic in-memory / network write refused / live broker write refused / silent drop refused / unsupervised retry refused / governed seal only.
2. **Policy gate** — fail-closed preconditions; `quarantine` must carry `messageId` + `poisonReason` + `sourceConsumer` + `attemptCount` (>=1); optional `payloadDigest` + `disposition`; refuse silent drop / unsupervised retry / schema-json add / tip rewrite / PR flip / GHE / L30–L33 reopen / L34 auto-close / mass prune / secrets / Fundacion / network write / live-broker write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `quarantineDigest` + `prevReceiptHash`; disposition PASS seals hermetic in-memory quarantine receipt (≠ live broker); never flips PRODUCTION_READY.

## Non-claims

PASS ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY ≠ silent drop. Soft-observe ≠ tip rewrite. Mission EB ≠ L34 closeout. Tip-refresh post-EB is SEPARATE next.
