# Design — Mission FD Outbound Delivery / Callback Target Registry & Binding

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`FD-RCPT-*`) with `deliveryDigest`; freeze soft-observe `f9a14e16` (`tipRewriteRefused`, `l40AutoCloseRefused`, `l39ReopenRefused`…`l30ReopenRefused`, `liveHttpEgressRefused`, `wallClockAuthorityRefused`, `tipRefreshAuthorityRefused`, `rawCallbackSecretMaterialRefused`, `schemaJsonAddRefused`); deliveryHold marks hermetic in-memory / fail-closed / callbackSecretMaterialRefused / outboundSecretZeroHeld / distinctFromEt/L33/Eu/Ew/Ez.
2. **Policy gate** — fail-closed preconditions; `binding` must carry opaque `targetId` + `deliveryId` + `targetClass` + `desiredBinding` (`BOUND|UNBOUND|HOLD`); optional `observedBinding` (hermetic injection); `authorized` must be `true`; Law VI refuse secret-looking fields (`password`, `token`, `apiKey`, `webhookSecret`, `hmacKey`, `hmacSecret`, …) via `SECRET_FIELD_FORBIDDEN`; DENY for live HTTP egresss / wall-clock / tip-refresh authority / ET-L33-EZ elevate / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L39 reopen / L40 auto-close / mass prune / secrets / Fundacion / network write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `deliveryDigest` + `prevReceiptHash`; PASS seals hermetic outbound binding (≠ EY/ET/L33/FE ≠ live HTTP egress); DENY fail-closed on unauthorized/invalid claim/secret fields; never flips PRODUCTION_READY; never binds live HTTP egresss or tip-refresh authority.

## Distinction from EY / ET / L33 / Canary / FE

| Surface | EY (outbound-delivery-callback registry binding) |
| --- | --- |
| EY ingress registry | L39 inbound external-event-ingress — distinct; do NOT elevate as outbound port |
| ET credential-handle | L38 opaque handle registry — distinct; do NOT elevate as outbound port |
| L33 domain-event outbound | Outbound messaging (≠ signed HTTP callback target registry) — distinct; do NOT reopen |
| EU secret-zero leak-deny | L38 secret-zero — distinct |
| EW credential honesty | L38 honesty attestation — distinct |
| EZ webhook authenticity | Next L40 satellite (signature-verify) — EY is registry/binding only |
| EY | Opaque targetId/deliveryId/targetClass/desiredBinding + authorized; observedBinding injected; Law VI absolute |

## Non-claims

PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ EY/ET/L33/Canary/FE ≠ live HTTP egress ≠ wall-clock authority. Soft-observe ≠ tip rewrite. Mission FD ≠ L39 closeout. Tip-refresh post-FD is SEPARATE next. Law VI held — never seal callback secrets / HMAC keys / webhook secrets.
