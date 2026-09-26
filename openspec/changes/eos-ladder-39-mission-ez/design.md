# Design — Mission EZ Webhook Authenticity / Signature-Verify Governance

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`EZ-RCPT-*`) with `authenticityDigest`; freeze soft-observe `cc9161f9` (`tipRewriteRefused`, `l39AutoCloseRefused`, `l38ReopenRefused`…`l30ReopenRefused`, `liveSignatureVerifyEndpointRefused`, `wallClockAuthorityRefused`, `tipRefreshAuthorityRefused`, `rawWebhookSecretMaterialRefused`, `schemaJsonAddRefused`); authenticityHold marks hermetic in-memory / fail-closed / webhookSecretMaterialRefused / authenticitySecretZeroHeld / distinctFromEt/L33/Eu/Ew/Ez.
2. **Policy gate** — fail-closed preconditions; `verify` must carry opaque L38 `handleId` + `authenticityClass` + `desiredVerdict` (optional soft-observe EY `ingressId`/`sourceId`) + `authenticityClass` + `desiredVerdict` (`AUTHENTIC|INAUTHENTIC|HOLD`); optional `observedVerdict` (hermetic injection); `authorized` must be `true`; Law VI refuse secret-looking fields (`password`, `token`, `apiKey`, `webhookSecret`, `hmacKey`, `hmacSecret`, …) via `SECRET_FIELD_FORBIDDEN`; DENY for live signature verify endpoints / wall-clock / tip-refresh authority / ET-L33-EZ elevate / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L38 reopen / L39 auto-close / mass prune / secrets / Fundacion / network write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `authenticityDigest` + `prevReceiptHash`; seals opaque handleId refs only; PASS seals hermetic authenticity verify (≠ ET/EY/AU/FA ≠ live signature verify endpoint); DENY fail-closed on unauthorized/invalid claim/secret fields; never flips PRODUCTION_READY; never binds live signature verify endpoints or tip-refresh authority.

## Distinction from ET / L33 / EU / EW / EZ

| Surface | EY (webhook authenticity binding) |
| --- | --- |
| ET credential-handle | L38 opaque handle registry — distinct; do NOT elevate as ingress port |
| L33 domain-event outbound | Outbound domain-event ports — distinct; do NOT reopen |
| EU secret-zero leak-deny | L38 secret-zero — distinct |
| EW credential honesty | L38 honesty attestation — distinct |
| EZ webhook authenticity | Next L39 satellite (signature-verify) — EY is registry/verify only |
| EY | Opaque handleId/sourceId/authenticityClass/desiredVerdict + authorized; observedVerdict injected; Law VI absolute |

## Non-claims

PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ ET/EU/EY/AU/FA ≠ live signature verify endpoint ≠ wall-clock authority. Soft-observe ≠ tip rewrite. Mission EZ ≠ L39 closeout. Tip-refresh post-EY is SEPARATE next. Law VI held — never seal webhook secrets / HMAC keys.
