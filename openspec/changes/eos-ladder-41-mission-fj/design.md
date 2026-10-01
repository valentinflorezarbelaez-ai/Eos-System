# Design — Mission FJ Round-Trip / Request-Reply Integrity

## Architecture

Pure Layer-0 triad under `src/core/composition/`. Governance detectors already exported by Mission FI (`findSecretLookingField`, ladder-reopen claims, Law VI scans, Fundacion path refusal) are called directly. FJ does not clone that matrix.

1. **Receipt** — nine-field SHA-256 seal (`FJ-RCPT-*`) with `integrityDigest`. Freeze soft-observe `78141c3d`. `integrityHold` records hermetic-only, secret refusal, composition on an FI correlation digest, and distinction from FI registry / FK quarantine / EY / FD / Canary.
2. **Policy gate** — fail-closed. Active mode requires an opaque round-trip claim plus a verified Mission FI receipt whose `decision` is `PASS` and whose `correlationDigest` equals the digest recomputed from the same opaque L39/L40 metadata. `desiredIntegrity` and `observedIntegrity` must both be `INTACT`. `requestRef` and `replyRef` must differ. Digests must be lowercase sha256 hex. HOLD mode seals nothing and does not require a round trip.
3. **Port** — `govern` + `verifyTrail`. DENY receipts copy only opaque keys, so secret-looking fields never enter the seal. PASS stores `fiReceiptHash` (the FI receipt hash), not the FI receipt body.

## Integrity rule

PASS only when all of the following hold:

- `authorized === true`
- `desiredIntegrity === observedIntegrity === INTACT`
- `requestRef !== replyRef`
- `correlationDigest === computeCorrelationDigest(opaque binding metadata)`
- embedded `fiReceipt` verifies, is `PASS`, and carries the same `correlationDigest`

A matching `BROKEN`/`BROKEN` observation is `INTEGRITY_NOT_INTACT` (DENY). A disagreement is `INTEGRITY_MISMATCH` (DENY).

## Non-claims

PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ FI registry ≠ FK quarantine ≠ live HTTP egress ≠ wall-clock authority. Soft-observe ≠ tip rewrite. Mission FJ ≠ L41 closeout. Tip-refresh post-FJ is SEPARATE. Law VI held.
