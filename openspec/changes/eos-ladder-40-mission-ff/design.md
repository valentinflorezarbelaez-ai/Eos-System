# Design — Mission FF Outbound Delivery Quarantine / Retry-Deny Governance

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`FF-RCPT-*`) with `quarantineDigest`; attached `retryDenyDigest`; freeze soft-observe `1079bddf` (`tipRewriteRefused`, `l40AutoCloseRefused`, `l38ReopenRefused`…`l30ReopenRefused`, `liveOutboundDeliveryMutationRefused`, `liveHttpEgressEndpointRefused`, `wallClockAuthorityRefused`, `tipRefreshAuthorityRefused`, `rawCallbackSecretMaterialRefused`, `rawPayloadMaterialRefused`, `schemaJsonAddRefused`); quarantineHold marks hermetic in-memory / fail-closed / callbackSecretMaterialRefused / quarantineSecretZeroHeld / distinctFromEy/Ez/Eb/L36/Eu/Ev/Fb.
2. **Policy gate** — fail-closed preconditions; `quarantine` must carry opaque `deliveryId` + `quarantineClass` + `desiredStage` (`QUARANTINE|HOLD|RETRY_DENY|RELEASE_HOLD|ACK|ADMIT`); optional soft-observe EY `sourceId` / EZ `authenticityRef`; optional `observedStage` (hermetic injection); `authorized` must be `true`; Law VI refuse secret-looking fields (`password`, `token`, `apiKey`, `webhookSecret`, `hmacKey`, `rawPayload`, …) via `SECRET_FIELD_FORBIDDEN`; DENY for live outbound delivery mutation / live HTTP egress endpoints / wall-clock / tip-refresh authority / EY-EZ-EB-L36-FB elevate / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L39 reopen / L40 auto-close / mass prune / secrets / Fundacion / network write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `quarantineDigest` + `retryDenyDigest` + `prevReceiptHash`; seals opaque deliveryId/targetId refs only; PASS seals hermetic quarantine stage (≠ FD/FE/EB/L36/FG ≠ live outbound delivery mutation); DENY fail-closed on unauthorized/invalid claim/secret fields; never flips PRODUCTION_READY; never mutates live ingress or tip-refresh authority.

## Stages (EV/EQ-adapted)

| Stage | Meaning |
| --- | --- |
| QUARANTINE | Hold inbound opaque ingress under quarantine |
| HOLD | Ritual / stage hold (zero mutation) |
| RETRY_DENY | Fail-closed deny of replayed / forged ordering claim |
| RELEASE_HOLD | Release prior hold (hermetic claim only) |
| ADMIT | Admit opaque ingress past quarantine (≠ L36 admission reopen) |

## Distinction from FD / FE / FA / EB / L36 / EU / EV / FG

| Surface | FF (outbound delivery quarantine / retry-deny) |
| --- | --- |
| FD outbound delivery registry | Registry/binding only — distinct; soft-observe opaque targetId/deliveryId |
| FE outbound callback authenticity | Signature-sign via L38 handles — distinct; soft-observe authenticityRef |
| EB dead-letter quarantine | L34 — fold concepts; do NOT reopen |
| L36 admission/backpressure | Fold concepts; do NOT reopen |
| EU secret-zero / EV lifecycle | L38 — distinct |
| FB ingress honesty | Next L39 satellite — FF is quarantine/retry-deny only |

## Non-claims

PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ FD/FE/EB/L36/FG ≠ live outbound delivery mutation ≠ wall-clock authority. Soft-observe ≠ tip rewrite. Mission FF ≠ L39 closeout. Tip-refresh post-FF is SEPARATE next. Law VI held — never seal callback secrets / HMAC keys / raw payloads.
