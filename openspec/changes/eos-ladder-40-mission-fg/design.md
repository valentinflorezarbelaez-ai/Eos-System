# Design — Mission FG Outbound Delivery Honesty & Receipt Attestation Governance

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — `outbound-delivery-honesty-attestation-receipt.js`
   - Seals nine canonical fields including opaque `attestationDigest`
   - Receipt ids `FG-RCPT-*`; operation `OUTBOUND_DELIVERY_HONESTY_ATTESTATION`
   - Soft-observe freeze pinShort `a7c7df8f` (do not rewrite)
   - Soft-observe FD/FE/FF opaque deliveryId/targetId/authenticityRef/quarantineRef refs only
2. **Policy Gate** — `outbound-delivery-honesty-attestation-policy-gate.js`
   - Fail-closed DENY on secret-looking fields / callback secrets / HMAC / raw payloads (Law VI)
   - Requires deliveryId + subjectKind + honestyClaims + authorized
   - Refuse live outbound delivery mutation, tip-refresh, PRODUCTION_READY flip, L30–L39 reopen, L40 auto-close
3. **Port** — `outbound-delivery-honesty-attestation-port.js`
   - `govern(input)` → PASS | HOLD | DENY with chained receipts
   - `verifyTrail()` cryptographic chain check

## Distinctness

| Mission | Axis | Relation to FG |
| --- | --- | --- |
| FD | Outbound delivery registry/bind | Soft-observe opaque ids; FG does not bind |
| FE | Outbound callback authenticity sign | Soft-observe opaque ids; FG does not sign/verify |
| FF | Quarantine / retry-deny | Soft-observe opaque ids; FG does not quarantine |
| FB | Ingress honesty (inbound) | Semantic mirror; outbound axis only |
| EW/ER/EH/EM | Other honesty axes | Fold concepts; do not reopen |
| FH | Seam-pack closeout | Next SEPARATE |

## Non-claims

PRODUCTION_READY=NO · Fundacion Δ=0 · schemas AT_CEILING 35/35 · no tip-refresh · no FH · L40 stays OPEN · Law VI held
