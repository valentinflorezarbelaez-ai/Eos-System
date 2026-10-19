# Design — Mission FJ Round-Trip / Request-Reply Integrity Governance

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`FJ-RCPT-*`) with `roundTripDigest`; freeze soft-observe `78141c3d` (`tipRewriteRefused`, `l41AutoCloseRefused`, `l40ReopenRefused`…`l30ReopenRefused`, `liveHttpEgressRefused`, `wallClockAuthorityRefused`, `tipRefreshAuthorityRefused`, `rawRoundTripSecretMaterialRefused`, `schemaJsonAddRefused`); integrityHold marks hermetic in-memory / fail-closed / requestReplyCorrelated / digestMatchRequired / roundTripSecretMaterialRefused / roundTripSecretZeroHeld / composesOverFiCorrelationRegistry / softObserveL39+L40 / distinctFromFi/EY/FD/FK/Canary.
2. **Policy gate** — fail-closed preconditions; `roundTrip` must carry opaque `correlationId` (FI correlated ref) + `roundTripId` + distinct `requestRef` / `replyRef` + sha256 `requestDigest` / `echoedRequestDigest` / `replyDigest` + `roundTripClass` + `desiredIntegrity` (`MATCH|MISMATCH|HOLD`); optional `observedIntegrity` (hermetic injection); `authorized` must be `true`; Law VI refuse secret-looking fields via `SECRET_FIELD_FORBIDDEN`; DENY for digest mismatch (`ROUND_TRIP_DIGEST_MISMATCH`) / MISMATCH-in-ACTIVE (`ROUND_TRIP_MISMATCH_REFUSED`) / live HTTP egress / wall-clock / tip-refresh authority / FI-FK-EY-FD-Canary elevate / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L40 reopen / L41 auto-close / mass prune / secrets / Fundacion / network write.
3. **Port** — `govern` + `verifyRoundTrip` + `verifyTrail`; chains receipts with `roundTripDigest` + `prevReceiptHash`; PASS seals hermetic round-trip integrity verification (≠ FI registry replacement ≠ FK quarantine ≠ live HTTP egress); DENY fail-closed on unauthorized/invalid claim/secret fields/digest mismatch; never flips PRODUCTION_READY; never binds live HTTP egress or tip-refresh authority.

## Integrity rule

`MATCH` ⇔ `requestDigest === echoedRequestDigest` (reply leg echoed the request leg intact). `replyDigest` is correlated as opaque metadata. All three are 64-char sha256 hex — raw payload bytes are refused. A `MISMATCH` desired state is refused in ACTIVE mode; quarantine/deny-on-mismatch is Mission FK (next).

`roundTripDigest` covers the opaque refs, sha256 digests, integrity states, `authorized`, and sealed `status`, so PASS / DENY / HOLD round-trip metadata is tamper-evident across the whole trail. PASS sealing throws if integrity is not verified; `verifyRoundTrip` re-checks the canonical seal, digest linkage, integrity match, and `integrityDigest`.

## Distinction from FI / FK / EY / FD / Canary

| Surface | Role vs FJ |
| --- | --- |
| FI correlation registry | Prior L41 satellite — supplies opaque correlated refs; FJ composes over it, does NOT replace it |
| FK mismatch quarantine | Next L41 satellite — quarantine/deny on correlation/integrity mismatch |
| EY ingress registry | L39 inbound — soft-observe opaque refs only; do NOT elevate; do NOT reopen L39 |
| FD outbound registry | L40 outbound — soft-observe opaque refs only; do NOT elevate; do NOT reopen L40 |
| Canary / Fundacion delivery | Lab/product delivery — not Layer-0 composition integrity |

## Non-claims

PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ FI registry replacement ≠ FK quarantine ≠ EY/FD/Canary ≠ live HTTP egress ≠ wall-clock authority. Soft-observe ≠ tip rewrite. Mission FJ ≠ L41 closeout. Tip-refresh post-FJ is SEPARATE next. Law VI held — never seal round-trip secrets / raw payloads.
