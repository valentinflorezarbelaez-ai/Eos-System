# Design — Mission EU Secret-Zero Leak-Deny & Redaction

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`EU-RCPT-*`) with `redactionDigest`; freeze soft-observe `bc24c17b` (`tipRewriteRefused`, `l38AutoCloseRefused`, `l37ReopenRefused`…`l30ReopenRefused`, `liveSecretStoreRefused`, `wallClockAuthorityRefused`, `tipRefreshAuthorityRefused`, `rawSecretMaterialRefused`, `schemaJsonAddRefused`); leakHold marks hermetic in-memory / fail-closed / secretMaterialRefused / secretZeroHeld / distinctFromEo/Ep/Eq/Er/Au.
2. **Policy gate** — fail-closed preconditions; `binding` must carry opaque `handleId` + `handleClass` + `desiredBinding` (`DENY_LEAK|REDACT|HOLD`); optional `observedBinding` (hermetic injection); `authorized` must be `true`; Law VI refuse secret-looking fields (`password`, `token`, `apiKey`, `privateKey`, `rawSecret`, `bearer`, …) via `SECRET_FIELD_FORBIDDEN`; DENY for live secret stores / wall-clock / tip-refresh authority / EO-EP-AU elevate / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L37 reopen / L38 auto-close / mass prune / secrets / Fundacion / network write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `redactionDigest` + `prevReceiptHash`; PASS seals hermetic handle binding (≠ EO/EP/AU ≠ live secret store); DENY fail-closed on unauthorized/invalid claim/secret fields; never flips PRODUCTION_READY; never binds live secret stores or tip-refresh authority.

## Distinction from EO / EP / EQ / ER / AU

| Surface | ET (secret-zero leak-deny / redaction) |
| --- | --- |
| EO feature-flag | Flag toggle port — distinct; do NOT elevate as handle port |
| EP policy-pack | Pack bind+evaluate — distinct; do NOT elevate as handle port |
| EQ staged activation | Config staged activation — distinct |
| ER config honesty | Config/flag honesty attestation — distinct |
| AU secret-runtime-broker | Runtime/env broker under `src/core/secrets/*` — fold concepts into ET semantics; do NOT reopen AU or copy secret material into composition receipts |
| ET | Opaque handleId/handleClass/desiredBinding + authorized; observedBinding injected; Law VI absolute |

## Non-claims

PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ EO/EP/EQ/ER/AU ≠ live secret store ≠ wall-clock authority. Soft-observe ≠ tip rewrite. Mission EU ≠ L38 closeout. Tip-refresh post-EU is SEPARATE next. Law VI held — never seal secrets.
