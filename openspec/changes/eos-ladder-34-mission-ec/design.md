# Design — Mission EC Domain Event Compatibility Gate

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`EC-RCPT-*`); freeze soft-observe `19b353d8` (`tipRewriteRefused`, `l34AutoCloseRefused`, `schemaJsonAddRefused`); compatibilityHold marks hermetic in-memory / network write refused / schema-json add refused / tip rewrite refused / breaking-without-deny refused / governed seal only.
2. **Policy gate** — fail-closed preconditions; `evolution` must carry `eventType` + `changeKind`; optional `fromVersion` / `toVersion` / `contractDigest`; PASS only for `COMPATIBLE` / `ADD_OPTIONAL_FIELD`; DENY for `BREAKING` / `RENAME_FORBIDDEN`; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L33 reopen / L34 auto-close / mass prune / secrets / Fundacion / network write / breaking-without-deny misuse.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `compatibilityDigest` + `prevReceiptHash`; PASS seals hermetic compatible evolution receipt (≠ schema JSON); never flips PRODUCTION_READY.

## Non-claims

PASS ≠ new schema JSON ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY. Soft-observe ≠ tip rewrite. Mission EC ≠ L34 closeout. Tip-refresh post-EC is SEPARATE next.
