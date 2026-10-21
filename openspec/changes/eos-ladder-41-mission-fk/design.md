# Design — Mission FK Bidirectional Mismatch Quarantine / Deny (DRAFT)

**Status:** DRAFT · docs-only · blocked on PR #577 merge. No runtime design is authorized to land before the FJ tip is sealed.

## Architecture (prospective)

Pure Layer-0 triad under `src/core/composition/`, mirroring FI/FJ boundaries:

1. **Receipt** — nine-field SHA-256 seal (`FK-RCPT-*`) with `mismatchDigest`; freeze soft-observe `<post-FJ tip>` (`tipRewriteRefused`, `l41AutoCloseRefused`, `l40ReopenRefused`…`l30ReopenRefused`, `liveHttpEgressRefused`, `wallClockAuthorityRefused`, `tipRefreshAuthorityRefused`, `rawMismatchSecretMaterialRefused`, `schemaJsonAddRefused`); quarantineHold marks hermetic in-memory / fail-closed / mismatchSecretMaterialRefused / mismatchSecretZeroHeld / consumesFiCorrelationBinding / consumesFjRoundTripVerdict / distinctFromFi/Fj/Fl/Canary.
2. **Policy gate** — fail-closed preconditions. Input carries opaque `correlationId` + `bindingId` (FI), `roundTripId` + `requestId` + `replyId` (FJ), `mismatchClass`, `desiredDisposition` (`QUARANTINE|DENY|HOLD`), and a hermetic `observedVerdict` (`VERIFIED|MISMATCH|HOLD`). PASS requires `observedVerdict === MISMATCH` and `authorized === true`; `VERIFIED` means no quarantine (no-op HOLD), never a false quarantine. Law VI refuses secret-looking fields; DENY for live HTTP egress / wall-clock / tip-refresh authority / FI-FJ-FL elevate / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L40 reopen / L41 auto-close / mass prune / network write.
3. **Port** — `govern` + `verifyTrail`; chains `FK-RCPT-*` with `mismatchDigest` + `prevReceiptHash`; PASS seals a hermetic quarantine/deny decision over opaque refs only (no payload bytes are stored or moved); DENY fail-closed on unauthorized/invalid claim/secret fields; never flips PRODUCTION_READY; never binds live transport or tip-refresh authority.

## Digest contract (prospective)

`mismatchDigest = sha256(canonical JSON of {
  correlationId, bindingId, roundTripId, requestId, replyId,
  requestDigest, replyDigest, mismatchClass, desiredDisposition, observedVerdict
})`

Only opaque identifiers, classes and non-secret sha256 digests. Quarantine is a **decision record**, not a payload copy: FK never stores or moves request/reply bodies (Law VI).

## Distinction from FI / FJ / FL / Canary

| Surface | Role vs FK |
| --- | --- |
| FI correlation registry | L41 prior — supplies opaque correlation binding; do NOT reopen FI |
| FJ round-trip integrity | L41 prior — supplies the integrity verdict FK acts on; do NOT reopen FJ |
| FL bidirectional honesty attestation | L41 next — attests claims beyond soft-observe; FK does not attest |
| Canary / Fundacion delivery | Lab/product delivery — not Layer-0 composition quarantine |
| FK | Fail-closed quarantine/deny decision on mismatch across correlated opaque refs |

## Non-claims

DRAFT ≠ FK MEASURED ≠ L41 CLOSED ≠ PRODUCTION_READY. Quarantine decision ≠ live HTTP egress ≠ wall-clock authority ≠ tip-refresh. Law VI held — never seal or copy request/reply secrets or raw payloads. Runtime FK requires explicit PO authorization after PR #577 merge and tip-refresh post-FJ.
