# Design — Mission FJ Round-Trip / Request-Reply Integrity

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`FJ-RCPT-*`) with `integrityDigest`; freeze soft-observe `78141c3d` (`tipRewriteRefused`, `l41AutoCloseRefused`, `l40ReopenRefused`…`l30ReopenRefused`, `liveHttpEgressRefused`, `wallClockAuthorityRefused`, `tipRefreshAuthorityRefused`, `rawIntegritySecretMaterialRefused`, `schemaJsonAddRefused`); integrityHold marks hermetic in-memory / fail-closed / integritySecretMaterialRefused / integritySecretZeroHeld / softObserve FI+L39+L40 / distinctFromEy/Fd/Fi/Fk.
2. **Policy gate** — fail-closed preconditions; `roundTrip` must carry opaque `correlationId` (FI soft-observe) + `requestId` + `replyId` + `ingressId` + `sourceId` (L39) + `targetId` + `deliveryId` (L40) + `integrityClass` + `desiredVerdict` (`INTACT|BROKEN|HOLD`); optional `observedVerdict` (hermetic injection); `authorized` must be `true`; Law VI refuse secret-looking fields via `SECRET_FIELD_FORBIDDEN`; DENY for live HTTP egress / wall-clock / tip-refresh authority / EY-FD-FI-FK elevate / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L40 reopen / L41 auto-close / mass prune / secrets / Fundacion / network write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `integrityDigest` + `prevReceiptHash`; PASS seals hermetic round-trip integrity verify (≠ EY/FD/FI/FK ≠ live HTTP egress); DENY fail-closed on unauthorized/invalid claim/secret fields; never flips PRODUCTION_READY; never binds live HTTP egress or tip-refresh authority.

## Distinction from FI / EY / FD / FK

| Surface | Role vs FJ |
| --- | --- |
| FI correlation registry | L41 first satellite — registry/binding only; soft-observe `correlationId`; do NOT elevate as integrity port |
| EY ingress registry | L39 inbound — soft-observe opaque ingressId/sourceId only; do NOT elevate as integrity port; do NOT reopen L39 |
| FD outbound registry | L40 outbound — soft-observe opaque targetId/deliveryId only; do NOT elevate as integrity port; do NOT reopen L40 |
| FK quarantine | Next L41 satellite — FJ is integrity verify only |
| FJ | Verifies round-trip / request-reply integrity across correlated opaque refs; Law VI absolute |

## Non-claims

PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ EY/FD/FI/FK/Canary ≠ live HTTP egress ≠ wall-clock authority. Soft-observe ≠ tip rewrite. Mission FJ ≠ L41 closeout. Tip-refresh post-FJ is SEPARATE next. Law VI held — never seal request/reply payloads or integrity secrets.
