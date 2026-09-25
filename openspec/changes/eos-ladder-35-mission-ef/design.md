# Design — Mission EF Schedule Wake & Deferred Trigger

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`EF-RCPT-*`); freeze soft-observe `0a286ad8` (`tipRewriteRefused`, `l35AutoCloseRefused`, `liveCronRefused`, `schemaJsonAddRefused`); scheduleHold marks hermetic in-memory / live cron refused / OS scheduler refused / network wake refused / tip rewrite refused / schema-json add refused / governed seal only.
2. **Policy gate** — fail-closed preconditions; `schedule` must carry `scheduleId` + `wakeAt` (ISO) + `triggerKind` (`ONCE`|`DEFERRED`); optional `deferredFromProcessId` / `payloadDigest`; PASS seals hermetic receipt; DENY for live cron / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L34 reopen / L35 auto-close / mass prune / secrets / Fundacion / network write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `scheduleDigest` + `prevReceiptHash`; PASS seals hermetic deferred-wake (≠ live cron); never flips PRODUCTION_READY; never binds process lifetime with real cron/OS schedulers.

## Non-claims

PASS ≠ live cron ≠ tip-refresh ≠ PRODUCTION_READY. Soft-observe ≠ tip rewrite. Mission EF ≠ L35 closeout. Tip-refresh post-EF is SEPARATE next.
