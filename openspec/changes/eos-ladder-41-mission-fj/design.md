# Design — Mission FJ Round-Trip / Request-Reply Integrity Governance

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`FJ-RCPT-*`) with `roundTripDigest`; freeze soft-observe `8903b57` (`tipRewriteRefused`, `l41AutoCloseRefused`, `l40ReopenRefused`…`l30ReopenRefused`, `liveHttpEgressRefused`, `wallClockAuthorityRefused`, `tipRefreshAuthorityRefused`, `rawRoundTripSecretMaterialRefused`, `schemaJsonAddRefused`); roundTripHold marks hermetic in-memory / fail-closed / roundTripSecretMaterialRefused / roundTripSecretZeroHeld / consumesFiCorrelationBinding / softObserveL39+L40 / distinctFromFi/Fk/Canary.
2. **Policy gate** — fail-closed preconditions; `roundTrip` must carry opaque `correlationId` + `bindingId` (FI binding) + `requestId` + `replyId` + `requestDigest` + `replyDigest` (64-hex sha256) + `correlationClass` + `integrityClass` + `desiredIntegrity` (`VERIFIED|MISMATCH|HOLD`); optional `observedIntegrity` (hermetic injection) must match desired; `authorized` must be `true`; Law VI refuse secret-looking fields via `SECRET_FIELD_FORBIDDEN`; DENY for live HTTP egress / wall-clock / tip-refresh authority / FI-FK elevate / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L40 reopen / L41 auto-close / mass prune / network write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `roundTripDigest` + `prevReceiptHash`; PASS seals hermetic round-trip integrity (≠ FI/FK ≠ live HTTP egress); DENY fail-closed on unauthorized/invalid claim/secret fields; never flips PRODUCTION_READY; never binds live transport or tip-refresh authority.

## Digest contract

`roundTripDigest = sha256(canonical JSON of {
  correlationId, bindingId, requestId, replyId,
  requestDigest, replyDigest, correlationClass, integrityClass,
  desiredIntegrity, observedIntegrity
})`

Only opaque identifiers, classes and non-secret sha256 digests. Secret-looking/raw payload fields are excluded by construction and refused by the gate (Law VI).

## Distinction from FI / FK / Canary

| Surface | Role vs FJ |
| --- | --- |
| FI correlation registry | Prior L41 satellite — FJ consumes its opaque binding; do NOT reopen FI |
| FK mismatch quarantine | Next L41 satellite — FJ verifies integrity only; quarantine/deny is FK |
| Canary / Fundacion delivery | Lab/product delivery — not Layer-0 composition integrity |
| FJ | Verifies request/reply round-trip integrity across correlated opaque refs; Law VI absolute |

## Non-claims

PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ FI/FK/Canary ≠ live HTTP egress ≠ wall-clock authority. Soft-observe ≠ tip rewrite. Mission FJ ≠ L41 closeout. Tip-refresh post-FJ is SEPARATE after merge. Law VI held — never seal request/reply secrets or raw payloads.
