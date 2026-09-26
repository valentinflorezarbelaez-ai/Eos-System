# Design — Mission FI Bidirectional Delivery Correlation Registry & Binding

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`FI-RCPT-*`) with `correlationDigest`; freeze soft-observe `78141c3d` (`tipRewriteRefused`, `l41AutoCloseRefused`, `l40ReopenRefused`…`l30ReopenRefused`, `liveHttpEgressRefused`, `wallClockAuthorityRefused`, `tipRefreshAuthorityRefused`, `rawCorrelationSecretMaterialRefused`, `schemaJsonAddRefused`); correlationHold marks hermetic in-memory / fail-closed / correlationSecretMaterialRefused / correlationSecretZeroHeld / softObserveL39+L40 / distinctFromEy/Fd/Fj/Canary.
2. **Policy gate** — fail-closed preconditions; `binding` must carry opaque `correlationId` + `ingressId` + `sourceId` (L39) + `targetId` + `deliveryId` (L40) + `correlationClass` + `desiredBinding` (`BOUND|UNBOUND|HOLD`); optional `observedBinding` / `bindingId` (hermetic injection); `authorized` must be `true`; Law VI refuse secret-looking fields via `SECRET_FIELD_FORBIDDEN`; DENY for live HTTP egress / wall-clock / tip-refresh authority / EY-FD-FJ elevate / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L40 reopen / L41 auto-close / mass prune / secrets / Fundacion / network write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `correlationDigest` + `prevReceiptHash`; PASS seals hermetic correlation binding (≠ EY/FD/FJ ≠ live HTTP egress); DENY fail-closed on unauthorized/invalid claim/secret fields; never flips PRODUCTION_READY; never binds live HTTP egress or tip-refresh authority.

## Distinction from EY / FD / FJ / Canary

| Surface | Role vs FI |
| --- | --- |
| EY ingress registry | L39 inbound — soft-observe opaque ingressId/sourceId only; do NOT elevate as correlation port; do NOT reopen L39 |
| FD outbound registry | L40 outbound — soft-observe opaque targetId/deliveryId only; do NOT elevate as correlation port; do NOT reopen L40 |
| FJ round-trip integrity | Next L41 satellite — FI is registry/binding only |
| Canary / Fundacion delivery | Lab/product delivery — not Layer-0 composition correlation |
| FI | Joins opaque L39+L40 refs into bidirectional correlation binding; Law VI absolute |

## Non-claims

PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ EY/FD/FJ/Canary ≠ live HTTP egress ≠ wall-clock authority. Soft-observe ≠ tip rewrite. Mission FI ≠ L41 closeout. Tip-refresh post-FI is SEPARATE next. Law VI held — never seal correlation secrets / raw payloads.
