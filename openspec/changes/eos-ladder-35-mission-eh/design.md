# Design — Mission EH Temporal Honesty & Deadline Attestation

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`EH-RCPT-*`); freeze soft-observe `ff4b6d19` (`tipRewriteRefused`, `l35AutoCloseRefused`, `liveTimerClaimRefused`, `productionReadyFlipRefused`, `schemaJsonAddRefused`); attestationHold marks hermetic in-memory / live-timer claim refused / wall-clock authority refused / tip rewrite refused / schema-json add refused / PRODUCTION_READY flip refused / governed seal only.
2. **Policy gate** — fail-closed preconditions; `attestation` must carry `subjectKind` ∈ DEADLINE|SCHEDULE|COMPENSATION|COMPOSITE + `honestyClaims` asserting softObserveFreeze / noLiveTimer / productionReadyNo / schemasAtCeiling; optional `subjectReceiptId`; PASS seals hermetic receipt; DENY for live-timer honesty lie / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L34 reopen / L35 auto-close / mass prune / secrets / Fundacion.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `attestationDigest` + `prevReceiptHash`; PASS seals hermetic only (≠ wall-clock authority); never flips PRODUCTION_READY; never schedules live timers.

## Non-claims

PASS ≠ wall-clock authority ≠ tip-refresh ≠ PRODUCTION_READY. Soft-observe ≠ tip rewrite. Mission EH ≠ L35 closeout. Tip-refresh post-EH is SEPARATE next.
