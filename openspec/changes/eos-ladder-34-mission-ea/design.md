# Design — Mission EA CQRS Read-Model Projection Port

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`EA-RCPT-*`); freeze soft-observe `1f2234cf` (`tipRewriteRefused`, `l34AutoCloseRefused`, `secondSourceOfTruthRefused`, `dualWriteRefused`); projectionHold marks projection disposable / second SoT refused / hermetic in-memory / network write refused / rebuildFromStream only.
2. **Policy gate** — fail-closed preconditions; `projection` must carry `projectionId` + `projectionType` + `sourceEvent` (`eventType` + `aggregateId` + non-empty `payload`); optional `rebuildFromStream` + `checkpoint`; refuse second SoT / dual-write / schema-json add / tip rewrite / PR flip / GHE / L30–L33 reopen / L34 auto-close / mass prune / secrets / Fundacion / network write / live-DB rebuild.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `projectionDigest` + `prevReceiptHash`; rebuildFromStream PASS seals hermetic in-memory rebuild receipt (≠ live DB); never flips PRODUCTION_READY.

## Non-claims

PASS ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY ≠ second SoT. Soft-observe ≠ tip rewrite. Mission EA ≠ L34 closeout. Tip-refresh post-EA is SEPARATE next.