# Design — Mission FB Ingress Honesty & Attestation Governance

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — `ingress-honesty-attestation-receipt.js`
   - Seals nine canonical fields including opaque `attestationDigest`
   - Receipt ids `FB-RCPT-*`; operation `INGRESS_HONESTY_ATTESTATION`
   - Soft-observe freeze pinShort `57edb92e` (do not rewrite)
   - Soft-observe EY/EZ/FA opaque ingressId/sourceId/handleId refs only
2. **Policy Gate** — `ingress-honesty-attestation-policy-gate.js`
   - Fail-closed DENY on secret-looking fields / webhook secrets / HMAC / raw payloads (Law VI)
   - Requires ingressId + subjectKind + honestyClaims + authorized
   - Refuse live ingress mutation, tip-refresh, PRODUCTION_READY flip, L30–L38 reopen, L39 auto-close
3. **Port** — `ingress-honesty-attestation-port.js`
   - `govern(input)` → PASS | HOLD | DENY with chained receipts
   - `verifyTrail()` cryptographic chain check

## Distinctness

| Mission | Axis | Relation to FB |
| --- | --- | --- |
| EY | Ingress registry/bind | Soft-observe opaque ids; FB does not bind |
| EZ | Webhook authenticity verify | Soft-observe opaque ids; FB does not verify HMAC |
| FA | Quarantine / replay-deny | Soft-observe opaque ids; FB does not quarantine |
| EW/ER/EH/EM | Other honesty axes | Fold concepts; do not reopen |
| FC | Seam-pack closeout | Next SEPARATE |

## Non-claims

PRODUCTION_READY=NO · Fundacion Δ=0 · schemas AT_CEILING 35/35 · no tip-refresh · no FC · L39 stays OPEN · Law VI held
