# ADR-0146 — Mission FB External Event Ingress Honesty & Attestation Port

- **Status:** Accepted — local governed (Ladder 39 / Mission FB)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign External Event Ingress & Webhook Authenticity Governance Fabric)
- **Spec:** SPEC-0164
- **Prior ADRs:** ADR-0142 (Ladder 39 Maturity Gap Audit), ADR-0143 (Mission EY), ADR-0144 (Mission EZ), ADR-0145 (Mission FA), ADR-0140 (Mission EW credential honesty — semantic mirror only)

## Context

Ladder 39 is **OPEN** (Audit MEASURED · EY MEASURED · EZ MEASURED · FA MEASURED · FB this · FC pending). Soft-observe freeze pin is `57edb92e` (full `57edb92e5e64d0c3c5a0f6a2e38def02f80746e0` — tip-refresh post-#540 / FA merge soft-observe). Formal L30–L38 remain **CLOSED** — **NEVER reopen**. Mission EY sealed opaque ingress registry (`EY-RCPT-*`); Mission EZ sealed webhook authenticity (`EZ-RCPT-*`); Mission FA sealed ingress quarantine/replay-deny (`FA-RCPT-*`); Mission EW sealed credential-handle honesty (`EW-RCPT-*`). Opaque ingress still lacks a fail-closed **honesty attestation** surface (binding match, authenticity/digest consistency, refuse webhook secrets/HMAC/raw payloads) that mirrors EW for the ingress axis without mutating live ingress. Tip-refresh post-FB is **SEPARATE**. Law VI is absolute — never seal secrets; seal opaque ingressId/sourceId/handleId + attestationDigest + stage/verdict only. Soft-observe EY/EZ/FA opaque ids only.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `ingress-honesty-attestation-receipt.js` — sealed `FB-RCPT-*` + freeze soft-observe `57edb92e` + `attestationHold` (`secretMaterialRefused` / `secretZeroHeld` / `rawWebhookSecretMaterialRefused`)
   - `ingress-honesty-attestation-policy-gate.js` — fail-closed govern preconditions + Law VI webhook/HMAC/secret/raw-payload refusal + live-ingress refusal + binding/digest checks
   - `ingress-honesty-attestation-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `INGRESS_HONESTY_ATTESTATION`.
3. Claim requires opaque `ingressId` + `subjectKind` (`EXTERNAL_EVENT_INGRESS|INGRESS_BINDING|WEBHOOK_AUTHENTICITY|QUARANTINE_CONSISTENCY|COMPOSITE`) + `honestyClaims` (softObserveFreeze, noLiveIngressMutation, productionReadyNo, schemasAtCeiling, secretZeroHeld); optional hermetic `observedClaim`; optional soft-observe `sourceId`/`handleId`; `bindingMatch` / `digestConsistent` must not be false; `authorized` must be `true` for PASS.
4. Digest field: `attestationDigest` (sha256 of opaque ingressId / sourceId / handleId / subjectKind / stage / binding metadata only — never secrets/webhook bodies/HMAC keys).
5. Fail-closed `DENY` + code `ATTESTATION_UNAUTHORIZED` when unauthorized; `BINDING_MISMATCH` / `DIGEST_INCONSISTENT` / `INVALID_ATTESTATION_CLAIM`; `SECRET_FIELD_FORBIDDEN` / `SECRET_LEAK_FORBIDDEN` under Law VI; `LIVE_INGRESS_HONESTY_LIE` / `RAW_WEBHOOK_SECRET_MATERIAL_FORBIDDEN`.
6. Refuse live ingress mutation / live webhook endpoint, wall-clock authority, tip-refresh authority, EY/EZ/FA/EW/AU elevate-as-port, tip-refresh, PRODUCTION_READY flip, L30–L38 reopen, L39 auto-close, schema-json add, Fundacion writes, GHE, mass prune.
7. Soft-observe freeze pinShort `57edb92e` only — do **not** rewrite freeze/matrix/m4 tip.
8. Hermetic tests FB1–FB17; patcher `scripts/patch-mission-fb.mjs`; OpenSpec `eos-ladder-39-mission-fb`.

## Alternatives Considered AND REJECTED

- Elevating EY registry / EZ authenticity / FA quarantine / EW credential honesty as the FB port — REJECTED: FB attests opaque ingress honesty; EY is bind ≠ attestation; EZ is verify ≠ attestation; FA is quarantine ≠ attestation; EW is credential-handle axis ≠ ingress axis.
- Live ingress mutation / live webhook endpoint / Date.now as authority / tip-refresh as authority — REJECTED: hermetic injected observedClaim only.
- Sealing plaintext secrets / webhook bodies / HMAC keys / secret-looking fields into receipts — REJECTED: Law VI absolute.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-FB is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L38 or auto-closing L39 — REJECTED (FC pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.
- Reopening AU / EW / ER / EH / EM product surfaces — REJECTED: fold concepts; do not reopen.

## Consequences

- Positive: Fourth L39 satellite seals fail-closed ingress honesty attestation with verifiable `FB-RCPT-*` receipts; FC can compose on this surface without sealing secrets.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L38 CLOSED, L39 OPEN (Audit+EY+EZ+FA MEASURED; FB this; FC pending), freeze pin `57edb92e` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ EY/EZ/FA/EW/ER/EH/EM/EU/EV/AU ≠ live ingress mutation ≠ wall-clock authority. Soft-observe alone ≠ ingress honesty truth.

## Links

- Audit: ADR-0142 (gap #4 honesty attestation / Mission FB)
- Prior: ADR-0143 (EY), ADR-0144 (EZ), ADR-0145 (FA), ADR-0140 (EW semantic mirror)
- OpenSpec: `openspec/changes/eos-ladder-39-mission-fb/`
