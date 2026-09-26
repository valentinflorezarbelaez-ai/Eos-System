# Design — Mission EW Credential Honesty & Handle Attestation

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`EW-RCPT-*`) with `attestationDigest`; freeze soft-observe `376378be` (`tipRewriteRefused`, `l38AutoCloseRefused`, `l37ReopenRefused`…`l30ReopenRefused`, `liveSecretStoreClaimRefused`, `vaultKmsRefused`, `wallClockAuthorityRefused`, `tipRefreshAuthorityRefused`, `rawSecretMaterialRefused`, `softObserveAloneNotHandleTruth`, `schemaJsonAddRefused`); attestationHold marks hermetic in-memory / fail-closed / secretMaterialRefused / secretZeroHeld / distinctFromEt/Eu/Ev/Er/Em/Eh/Au.
2. **Policy gate** — fail-closed preconditions; `attestation` must carry opaque `handleId` + `subjectKind` (`CREDENTIAL_HANDLE|HANDLE_BINDING|HANDLE_LIFECYCLE|COMPOSITE`) + `honestyClaims`; optional `observedClaim` (hermetic); `bindingMatch` / `digestConsistent` must not be false; `authorized` must be `true`; Law VI refuse secret-looking fields (`password`, `token`, `apiKey`, `secret`, …) via `SECRET_FIELD_FORBIDDEN`; DENY for live secret store honesty lies / vault-KMS / wall-clock / tip-refresh / ET-EU-EV-ER elevate / missing fields / governance violations.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `attestationDigest` + `prevReceiptHash`; PASS seals hermetic handle honesty attestation (≠ ET/EU/EV/ER ≠ live secret store); DENY fail-closed on unauthorized/invalid claim/secret fields; never flips PRODUCTION_READY; never mutates live secrets or tip-refresh authority.

## Distinction from ET / EU / EV / ER

| Surface | EW (credential-handle honesty attestation) |
| --- | --- |
| ET credential-handle registry | Opaque bind — distinct; do NOT elevate as attestation port |
| EU secret-zero leak-deny | Leak-deny / redaction — distinct; do NOT elevate as attestation port |
| EV credential-handle lifecycle | Lifecycle rotate/revoke — distinct; do NOT elevate as attestation port |
| ER config honesty | Config/flag honesty — distinct axis (config ≠ credential handle) |
| EM/EH | Capacity / temporal honesty — distinct axes |
| AU secret-runtime-broker | Runtime/env broker under `src/core/secrets/*` — fold concepts; do NOT reopen AU |
| EW | Opaque handleId + subjectKind + honestyClaims + authorized; observedClaim injected; Law VI absolute |

## Non-claims

PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ ET/EU/EV/ER/EM/EH/AU ≠ live secret store ≠ wall-clock authority. Soft-observe alone ≠ handle truth. Soft-observe ≠ tip rewrite. Mission EW ≠ L38 closeout. Tip-refresh post-EW is SEPARATE next. Law VI held — never seal secrets.
