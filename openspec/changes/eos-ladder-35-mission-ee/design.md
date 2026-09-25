# Design — Mission EE Temporal Deadline & TTL Governance

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`EE-RCPT-*`); freeze soft-observe `9600063c` (`tipRewriteRefused`, `l35AutoCloseRefused`, `l34ReopenRefused`, `liveTimerRefused`, `schemaJsonAddRefused`); temporalHold marks hermetic in-memory / live timer refused / wall-clock scheduler refused / tip rewrite refused / schema-json add refused / governed seal only.
2. **Policy gate** — fail-closed preconditions; `deadline` must carry `processId` + `deadlineAt` (ISO); optional `ttlMs` / `clockSkewBudgetMs` / `triggerEvent` / `observedExpired`; PASS seals hermetic receipt; EXPIRE when `observedExpired`; DENY for live timers / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L34 reopen / L35 auto-close / mass prune / secrets / Fundacion / network write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `deadlineDigest` + `prevReceiptHash`; PASS seals hermetic deadline/TTL (≠ live timer); EXPIRE fail-closed; never flips PRODUCTION_READY; never binds process lifetime with real timers.

## Non-claims

PASS ≠ live timer ≠ tip-refresh ≠ PRODUCTION_READY. Soft-observe ≠ tip rewrite. Mission EE ≠ L35 closeout. Tip-refresh post-EE is SEPARATE next.
