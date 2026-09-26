# ADR-0152 — Mission FG Outbound Delivery Honesty & Receipt Attestation Port

- **Status:** Accepted — local governed (Ladder 40 / Mission FG)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Outbound Delivery & Callback Authenticity Governance Fabric)
- **Spec:** SPEC-0169
- **Prior ADRs:** ADR-0148 (Ladder 40 Maturity Gap Audit), ADR-0149 (Mission FD), ADR-0150 (Mission FE), ADR-0151 (Mission FF), ADR-0146 (Mission FB ingress honesty — semantic mirror)

## Context

Ladder 40 is **OPEN** (Audit MEASURED · FD MEASURED · FE MEASURED · FF MEASURED · FG this · FH pending). Soft-observe freeze pin is `a7c7df8f` (full `a7c7df8f04c52d081de21b61ffe6b1f699e614bc` — tip-refresh post-#555 / FF merge soft-observe). Formal L30–L39 remain **CLOSED** — **NEVER reopen**. Mission FD sealed opaque outbound delivery registry (`FD-RCPT-*`); Mission FE sealed outbound callback authenticity (`FE-RCPT-*`); Mission FF sealed outbound delivery quarantine/retry-deny (`FF-RCPT-*`); Mission FB sealed ingress honesty on the inbound axis (`FB-RCPT-*`). Opaque outbound delivery still lacks a fail-closed **honesty attestation** surface (binding match, authenticity/digest consistency, refuse callback secrets/HMAC/raw payloads) that mirrors FB for the outbound axis without mutating live outbound delivery. Tip-refresh post-FG is **SEPARATE**. Law VI is absolute — never seal secrets; seal opaque deliveryId/targetId/authenticityRef/quarantineRef + attestationDigest + stage/verdict only. Soft-observe FD/FE/FF opaque ids only.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `outbound-delivery-honesty-attestation-receipt.js` — sealed `FG-RCPT-*` + freeze soft-observe `a7c7df8f` + `attestationHold` (`secretMaterialRefused` / `secretZeroHeld` / `rawCallbackSecretMaterialRefused`)
   - `outbound-delivery-honesty-attestation-policy-gate.js` — fail-closed govern preconditions + Law VI callback/HMAC/secret/raw-payload refusal + live-outbound refusal + binding/digest checks
   - `outbound-delivery-honesty-attestation-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `OUTBOUND_DELIVERY_HONESTY_ATTESTATION`.
3. Claim requires opaque `deliveryId` + `subjectKind` (`OUTBOUND_DELIVERY|DELIVERY_BINDING|CALLBACK_AUTHENTICITY|QUARANTINE_CONSISTENCY|COMPOSITE`) + `honestyClaims` (softObserveFreeze, noLiveOutboundDeliveryMutation, productionReadyNo, schemasAtCeiling, secretZeroHeld); optional hermetic `observedClaim`; optional soft-observe `targetId`/`authenticityRef`/`quarantineRef`; `bindingMatch` / `digestConsistent` must not be false; `authorized` must be `true` for PASS.
4. Digest field: `attestationDigest` (sha256 of opaque deliveryId / targetId / authenticityRef / quarantineRef / subjectKind / stage / binding metadata only — never secrets/callback bodies/HMAC keys).
5. Fail-closed `DENY` + code `ATTESTATION_UNAUTHORIZED` when unauthorized; `BINDING_MISMATCH` / `DIGEST_INCONSISTENT` / `INVALID_ATTESTATION_CLAIM`; `SECRET_FIELD_FORBIDDEN` / `SECRET_LEAK_FORBIDDEN` under Law VI; `LIVE_OUTBOUND_DELIVERY_HONESTY_LIE` / `RAW_CALLBACK_SECRET_MATERIAL_FORBIDDEN`.
6. Refuse live outbound delivery mutation / live HTTP egress endpoint, wall-clock authority, tip-refresh authority, FD/FE/FF/FB/AU elevate-as-port, tip-refresh, PRODUCTION_READY flip, L30–L39 reopen, L40 auto-close, schema-json add, Fundacion writes, GHE, mass prune.
7. Soft-observe freeze pinShort `a7c7df8f` only — do **not** rewrite freeze/matrix/m4 tip.
8. Hermetic tests FG1–FG17; patcher `scripts/patch-mission-fg.mjs`; OpenSpec `eos-ladder-40-mission-fg`.

## Alternatives Considered AND REJECTED

- Elevating FD registry / FE authenticity / FF quarantine / FB ingress honesty as the FG port — REJECTED: FG attests opaque outbound delivery honesty; FD is bind ≠ attestation; FE is sign ≠ attestation; FF is quarantine ≠ attestation; FB is ingress axis ≠ outbound axis.
- Live outbound delivery mutation / live HTTP egress endpoint / Date.now as authority / tip-refresh as authority — REJECTED: hermetic injected observedClaim only.
- Sealing plaintext secrets / callback bodies / HMAC keys / secret-looking fields into receipts — REJECTED: Law VI absolute.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-FG is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L39 or auto-closing L40 — REJECTED (FH pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.
- Reopening AU / EW / ER / EH / EM / FB product surfaces — REJECTED: fold concepts; do not reopen.

## Consequences

- Positive: Fourth L40 satellite seals fail-closed outbound delivery honesty attestation with verifiable `FG-RCPT-*` receipts; FH can compose on this surface without sealing secrets.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L39 CLOSED, L40 OPEN (Audit+FD+FE+FF MEASURED; FG this; FH pending), freeze pin `a7c7df8f` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ FD/FE/FF/FB/ER/EH/EM/EU/EV/AU ≠ live outbound delivery mutation ≠ wall-clock authority. Soft-observe alone ≠ outbound delivery honesty truth.

## Links

- Audit: ADR-0148 (Ladder 40 Maturity Gap Audit)
- Prior: ADR-0149 (FD), ADR-0150 (FE), ADR-0151 (FF), ADR-0146 (FB semantic mirror)
- OpenSpec: `openspec/changes/eos-ladder-40-mission-fg/`
