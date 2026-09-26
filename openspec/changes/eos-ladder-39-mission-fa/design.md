# Design — Mission FA Ingress Quarantine / Replay-Deny Governance

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`FA-RCPT-*`) with `quarantineDigest`; attached `replayDenyDigest`; freeze soft-observe `3cbb32dc` (`tipRewriteRefused`, `l39AutoCloseRefused`, `l38ReopenRefused`…`l30ReopenRefused`, `liveIngressMutationRefused`, `liveWebhookIngressEndpointRefused`, `wallClockAuthorityRefused`, `tipRefreshAuthorityRefused`, `rawWebhookSecretMaterialRefused`, `rawPayloadMaterialRefused`, `schemaJsonAddRefused`); quarantineHold marks hermetic in-memory / fail-closed / webhookSecretMaterialRefused / quarantineSecretZeroHeld / distinctFromEy/Ez/Eb/L36/Eu/Ev/Fb.
2. **Policy gate** — fail-closed preconditions; `quarantine` must carry opaque `ingressId` + `quarantineClass` + `desiredStage` (`QUARANTINE|HOLD|REPLAY_DENY|RELEASE_HOLD|ADMIT`); optional soft-observe EY `sourceId` / EZ `authenticityRef`; optional `observedStage` (hermetic injection); `authorized` must be `true`; Law VI refuse secret-looking fields (`password`, `token`, `apiKey`, `webhookSecret`, `hmacKey`, `rawPayload`, …) via `SECRET_FIELD_FORBIDDEN`; DENY for live ingress mutation / live webhook ingress endpoints / wall-clock / tip-refresh authority / EY-EZ-EB-L36-FB elevate / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L38 reopen / L39 auto-close / mass prune / secrets / Fundacion / network write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `quarantineDigest` + `replayDenyDigest` + `prevReceiptHash`; seals opaque ingressId/sourceId refs only; PASS seals hermetic quarantine stage (≠ EY/EZ/EB/L36/FB ≠ live ingress mutation); DENY fail-closed on unauthorized/invalid claim/secret fields; never flips PRODUCTION_READY; never mutates live ingress or tip-refresh authority.

## Stages (EV/EQ-adapted)

| Stage | Meaning |
| --- | --- |
| QUARANTINE | Hold inbound opaque ingress under quarantine |
| HOLD | Ritual / stage hold (zero mutation) |
| REPLAY_DENY | Fail-closed deny of replayed / forged ordering claim |
| RELEASE_HOLD | Release prior hold (hermetic claim only) |
| ADMIT | Admit opaque ingress past quarantine (≠ L36 admission reopen) |

## Distinction from EY / EZ / EB / L36 / EU / EV / FB

| Surface | FA (ingress quarantine / replay-deny) |
| --- | --- |
| EY ingress registry | Registry/binding only — distinct; soft-observe opaque ids |
| EZ webhook authenticity | Signature-verify via L38 handles — distinct; soft-observe authenticityRef |
| EB dead-letter quarantine | L34 — fold concepts; do NOT reopen |
| L36 admission/backpressure | Fold concepts; do NOT reopen |
| EU secret-zero / EV lifecycle | L38 — distinct |
| FB ingress honesty | Next L39 satellite — FA is quarantine/replay-deny only |

## Non-claims

PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ EY/EZ/EB/L36/FB ≠ live ingress mutation ≠ wall-clock authority. Soft-observe ≠ tip rewrite. Mission FA ≠ L39 closeout. Tip-refresh post-FA is SEPARATE next. Law VI held — never seal webhook secrets / HMAC keys / raw payloads.
