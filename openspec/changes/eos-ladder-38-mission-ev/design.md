# Design — Mission EV Credential Handle Lifecycle / Rotation

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`EV-RCPT-*`) with `lifecycleDigest`; freeze soft-observe `0eace5df` (`tipRewriteRefused`, `l38AutoCloseRefused`, `l37ReopenRefused`…`l30ReopenRefused`, `liveSecretMutationRefused`, `liveSecretStoreRefused`, `vaultKmsRefused`, `wallClockAuthorityRefused`, `tipRefreshAuthorityRefused`, `rawSecretMaterialRefused`, `schemaJsonAddRefused`); lifecycleHold marks hermetic in-memory / fail-closed / secretMaterialRefused / secretZeroHeld / distinctFromEt/Eu/Eq/Eo/Ep/Er/Au.
2. **Policy gate** — fail-closed preconditions; `lifecycle` must carry opaque `handleId` + `desiredStage` (`STAGED_ROTATE|ROTATE|REVOKE|HOLD|ROLLBACK_HOLD`); optional `observedLifecycle` (hermetic injection); `authorized` must be `true`; Law VI refuse secret-looking fields (`password`, `token`, `apiKey`, `privateKey`, `rawSecret`, `bearer`, `newSecret`, …) via `SECRET_FIELD_FORBIDDEN`; DENY for live secret mutation / vault-KMS / wall-clock / tip-refresh authority / ET-EU-EQ elevate / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L37 reopen / L38 auto-close / mass prune / secrets / Fundacion / network write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `lifecycleDigest` + `prevReceiptHash`; PASS seals hermetic handle lifecycle (≠ ET/EU/EQ ≠ live secret mutation); DENY fail-closed on unauthorized/invalid claim/secret fields; never flips PRODUCTION_READY; never mutates live secrets or tip-refresh authority.

## Distinction from ET / EU / EQ

| Surface | EV (credential-handle lifecycle / rotation) |
| --- | --- |
| ET credential-handle registry | Opaque bind — distinct; do NOT elevate as lifecycle port |
| EU secret-zero leak-deny | Leak-deny / redaction — distinct; do NOT elevate as lifecycle port |
| EQ staged activation | Config pack staged activation — distinct (config ≠ credential handle lifecycle) |
| EO/EP/ER | Flag / pack / config honesty — distinct |
| AU secret-runtime-broker | Runtime/env broker under `src/core/secrets/*` — fold concepts; do NOT reopen AU |
| EV | Opaque handleId + desiredStage + authorized; observedLifecycle injected; Law VI absolute |

## Non-claims

PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ ET/EU/EQ/AU ≠ live secret mutation ≠ wall-clock authority. Soft-observe ≠ tip rewrite. Mission EV ≠ L38 closeout. Tip-refresh post-EV is SEPARATE next. Law VI held — never seal secrets; never new plaintext credentials on rotate.
