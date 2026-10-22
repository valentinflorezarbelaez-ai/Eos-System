# Design — Mission FL Bidirectional Delivery Honesty & Integrity Attestation

**Status:** READY · authorized post-#578 merge (`e1a17e9b`). FK is MEASURED; FL runtime authorized.

## Architecture

Pure Layer-0 triad under `src/core/composition/`, mirroring FI/FJ/FK boundaries:

1. **Receipt** — nine-field SHA-256 seal (`FL-RCPT-*`) with `attestationDigest`; freeze soft-observe `e1a17e9b` (`tipRewriteRefused`, `l41AutoCloseRefused`, `l40ReopenRefused`…`l30ReopenRefused`, `liveHttpEgressRefused`, `wallClockAuthorityRefused`, `tipRefreshAuthorityRefused`, `rawAttestationSecretMaterialRefused`, `schemaJsonAddRefused`); `attestationHold` marks hermetic in-memory / fail-closed / attestationSecretMaterialRefused / attestationSecretZeroHeld / attestOnly / noPayloadCopy / consumesFiCorrelationBinding / consumesFjRoundTripVerdict / consumesFkQuarantineDecision / distinctFromFi/Fj/Fk/Canary.
2. **Policy gate** — fail-closed preconditions. Input carries opaque `correlationId` + `bindingId` (FI), `roundTripId` + `requestId` + `replyId` (FJ), `quarantineDecisionId` + `mismatchDigest` (FK), `attestationClass`, `desiredAttestation` (`ATTEST_INTEGRITY|ATTEST_HONESTY|HOLD`), and a hermetic `observedClaim` (`CONSISTENT|CONTRADICTED|UNVERIFIED|HOLD`). PASS requires `observedClaim === CONSISTENT` and `authorized === true`; `CONTRADICTED` is a fail-closed DENY (FL never attests a contradicted claim); `UNVERIFIED` / `HOLD` produce a no-op HOLD. Law VI refuses secret-looking fields; DENY for live HTTP egress / wall-clock / tip-refresh authority / FI-FJ-FK elevate / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L40 reopen / L41 auto-close / mass prune / network write.
3. **Port** — `govern` + `verifyTrail`; chains `FL-RCPT-*` with `attestationDigest` + `prevReceiptHash`; PASS seals a hermetic attestation over opaque refs and claim verdicts only (no payload bytes are stored or moved); DENY fail-closed on unauthorized/contradicted/invalid claim/secret fields; never flips PRODUCTION_READY; never binds live transport or tip-refresh authority.

## Digest contract

`attestationDigest = sha256(canonical JSON of {
  correlationId, bindingId, roundTripId, requestId, replyId,
  requestDigest, replyDigest, quarantineDecisionId, mismatchDigest,
  attestationClass, desiredAttestation, observedClaim
})`

Only opaque identifiers, classes, claim verdicts and non-secret sha256 digests. Attestation is a **decision record**, not a payload copy: FL never stores or moves request/reply bodies (Law VI).

## Distinction from FI / FJ / FK / FM / Canary

| Surface | Role vs FL |
| --- | --- |
| FI correlation registry | L41 prior — supplies opaque correlation binding; do NOT reopen FI |
| FJ round-trip integrity | L41 prior — supplies the integrity verdict FL attests on; do NOT reopen FJ |
| FK mismatch quarantine | L41 prior — supplies the quarantine/deny decision FL consumes; do NOT reopen FK |
| FM seam-pack closeout | L41 next — consolidates and seals L41; FL does not close the ladder |
| Canary / Fundacion delivery | Lab/product delivery — not Layer-0 composition attestation |
| FL | Fail-closed honesty & integrity attestation over correlated opaque refs |

## Decision table

| observedClaim | authorized | Decision |
| --- | --- | --- |
| CONSISTENT | true | PASS (sealed attestation) |
| CONSISTENT | false | DENY `ATTESTATION_UNAUTHORIZED` |
| CONTRADICTED | any | DENY `CLAIM_CONTRADICTED` |
| UNVERIFIED | any | HOLD (no-op, no attestation) |
| HOLD | any | HOLD (no-op, no attestation) |

## Non-claims

FL package ≠ L41 CLOSED ≠ PRODUCTION_READY. Attestation decision ≠ live HTTP egress ≠ wall-clock authority ≠ tip-refresh. Law VI held — never seal or copy request/reply secrets or raw payloads. Runtime FL requires explicit PO authorization after PR #578 merge and tip-refresh post-FK.
