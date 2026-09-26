# Design — Mission FE Outbound Callback Authenticity / Signature-Sign

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`FE-RCPT-*`) with `authenticityDigest` (alias `signatureDigest`); freeze soft-observe `7b47bf8b` (`tipRewriteRefused`, `l40AutoCloseRefused`, `l39ReopenRefused`…`l30ReopenRefused`, `liveSignatureSignEndpointRefused`, `wallClockAuthorityRefused`, `tipRefreshAuthorityRefused`, `rawCallbackSecretMaterialRefused`, `schemaJsonAddRefused`); authenticityHold marks hermetic in-memory / fail-closed / callbackSecretMaterialRefused / authenticitySecretZeroHeld / distinctFromEt/L33/Eu/Ew/Ez/Fd/Au/Ff.
2. **Policy gate** — fail-closed preconditions; `sign` must carry opaque `handleId` + `authenticityClass` + `desiredVerdict` (`SIGNED|UNSIGNED|HOLD`); optional `observedVerdict` (hermetic injection); optional opaque FD `targetId`/`deliveryId` soft-observe; `authorized` must be `true`; Law VI refuse secret-looking fields (`password`, `token`, `apiKey`, `webhookSecret`, `hmacKey`, `signingKey`, `callbackSecret`, …) via `SECRET_FIELD_FORBIDDEN`; DENY for live signature sign endpoint / wall-clock / tip-refresh authority / ET-EZ-FD elevate / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L39 reopen / L40 auto-close / mass prune / secrets / Fundacion / network write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `authenticityDigest` + `prevReceiptHash`; PASS seals hermetic outbound sign (≠ ET/EZ/FD/AU/FF ≠ live signature sign endpoint); DENY fail-closed on unauthorized/invalid claim/secret fields; never flips PRODUCTION_READY; never binds live crypto or tip-refresh authority.

## Distinction from EZ / FD / ET / AU / FF

| Surface | Role vs FE |
| --- | --- |
| EZ webhook authenticity verify | L39 inbound signature-**verify** — distinct mirror; do NOT elevate as outbound sign |
| FD outbound delivery/callback registry | L40 registry/binding only — soft-observe `targetId`/`deliveryId`; do NOT elevate as authenticity |
| ET credential-handle | L38 opaque handle registry — FE consumes `handleId` only; do NOT elevate as sign port |
| AU secret runtime broker | Runtime secrets — distinct; Law VI absolute |
| FF quarantine | Next L40 satellite — do NOT implement here |
| FE | Opaque handleId/authenticityClass/desiredVerdict + authorized; observedVerdict injected; FD ids soft-observe; Law VI absolute |

## Non-claims

PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ ET/EZ/FD/AU/FF ≠ live signature sign endpoint ≠ wall-clock authority. Soft-observe ≠ tip rewrite. Mission FE ≠ L40 closeout. Tip-refresh post-FE is SEPARATE next. Law VI held — never seal callback secrets / HMAC keys / webhook secrets / signing keys.
