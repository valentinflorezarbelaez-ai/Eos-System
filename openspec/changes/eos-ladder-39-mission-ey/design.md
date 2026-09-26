# Design — Mission EY External Event Ingress Registry & Binding

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`EY-RCPT-*`) with `ingressDigest`; freeze soft-observe `987702da` (`tipRewriteRefused`, `l39AutoCloseRefused`, `l38ReopenRefused`…`l30ReopenRefused`, `liveWebhookEndpointRefused`, `wallClockAuthorityRefused`, `tipRefreshAuthorityRefused`, `rawWebhookSecretMaterialRefused`, `schemaJsonAddRefused`); ingressHold marks hermetic in-memory / fail-closed / webhookSecretMaterialRefused / ingressSecretZeroHeld / distinctFromEt/L33/Eu/Ew/Ez.
2. **Policy gate** — fail-closed preconditions; `binding` must carry opaque `ingressId` + `sourceId` + `sourceClass` + `desiredBinding` (`BOUND|UNBOUND|HOLD`); optional `observedBinding` (hermetic injection); `authorized` must be `true`; Law VI refuse secret-looking fields (`password`, `token`, `apiKey`, `webhookSecret`, `hmacKey`, `hmacSecret`, …) via `SECRET_FIELD_FORBIDDEN`; DENY for live webhook endpoints / wall-clock / tip-refresh authority / ET-L33-EZ elevate / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L38 reopen / L39 auto-close / mass prune / secrets / Fundacion / network write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `ingressDigest` + `prevReceiptHash`; PASS seals hermetic ingress binding (≠ ET/L33/EZ ≠ live webhook endpoint); DENY fail-closed on unauthorized/invalid claim/secret fields; never flips PRODUCTION_READY; never binds live webhook endpoints or tip-refresh authority.

## Distinction from ET / L33 / EU / EW / EZ

| Surface | EY (external-event-ingress registry binding) |
| --- | --- |
| ET credential-handle | L38 opaque handle registry — distinct; do NOT elevate as ingress port |
| L33 domain-event outbound | Outbound domain-event ports — distinct; do NOT reopen |
| EU secret-zero leak-deny | L38 secret-zero — distinct |
| EW credential honesty | L38 honesty attestation — distinct |
| EZ webhook authenticity | Next L39 satellite (signature-verify) — EY is registry/binding only |
| EY | Opaque ingressId/sourceId/sourceClass/desiredBinding + authorized; observedBinding injected; Law VI absolute |

## Non-claims

PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ ET/L33/EU/EW/EZ ≠ live webhook endpoint ≠ wall-clock authority. Soft-observe ≠ tip rewrite. Mission EY ≠ L39 closeout. Tip-refresh post-EY is SEPARATE next. Law VI held — never seal webhook secrets / HMAC keys.
