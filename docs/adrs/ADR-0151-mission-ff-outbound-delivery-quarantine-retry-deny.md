# ADR-0151 — Mission FF Outbound Delivery Quarantine / Retry-Deny & Ordering Governance Port

- **Status:** Accepted — local governed (Ladder 40 / Mission FF)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Outbound Delivery & Callback Authenticity Governance Fabric)
- **Spec:** SPEC-0168
- **Prior ADRs:** ADR-0142 (Ladder 40 Maturity Gap Audit), ADR-0148 (Ladder 40 Audit), ADR-0149 (Mission FD), ADR-0150 (Mission FE)

## Context

Ladder 40 is **OPEN** (Audit MEASURED · FD MEASURED · FE MEASURED · FF this · FG–FH pending; freeze soft-observe pin `1079bddf` (FE merge #553 / tip-refresh #554)). Formal L30–L39 remain **CLOSED** — **NEVER reopen**. FD sealed opaque ingress registry binding; FE sealed webhook authenticity verify via L38 opaque handles — but there is **no** Layer-0 outbound delivery quarantine / retry-deny / ordering surface under `src/core/composition/`. EB dead-letter quarantine (L34) and L36 admission/backpressure are **distinct** — fold concepts only; do **not** reopen. Mission FF (outbound delivery quarantine / retry-deny) is the **next** satellite — FG honesty is next after FA.

This ADR accepts Mission FF as the third L39 satellite: a hermetic Outbound Delivery Quarantine / Retry-Deny & Ordering Governance Port that seals `FF-RCPT-*` receipts with `quarantineDigest` / `retryDenyDigest` over opaque delivery/target metadata only. Tip-refresh post-FF is **SEPARATE** and must not land in this package. Law VI is absolute — refuse callback secrets, HMAC keys, raw callback bodies/payloads with secret fields; never seal secrets.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `outbound-delivery-quarantine-retry-deny-receipt.js` — sealed `FF-RCPT-*` + freeze soft-observe `1079bddf` + `quarantineHold` (`callbackSecretMaterialRefused` / `quarantineSecretZeroHeld`)
   - `outbound-delivery-quarantine-retry-deny-policy-gate.js` — fail-closed govern preconditions + Law VI callback/HMAC/secret/raw-payload refusal
   - `outbound-delivery-quarantine-retry-deny-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `OUTBOUND_DELIVERY_QUARANTINE_RETRY_DENY`.
3. Quarantine requires opaque `deliveryId` + `quarantineClass` + `desiredStage` (`QUARANTINE|HOLD|RETRY_DENY|RELEASE_HOLD|ACK|ADMIT`); optional hermetic `observedStage`; optional soft-observe FD `targetId` / FE `authenticityRef`; `authorized` must be `true` for PASS.
4. Digest fields: `quarantineDigest` (canonical seal) + attached `retryDenyDigest` (sha256 of opaque outbound delivery metadata only — never secret/raw payload material).
5. Fail-closed `DENY` + code `QUARANTINE_UNAUTHORIZED` when unauthorized; `INVALID_STAGE_CLAIM` when hermetic observedStage mismatches desiredStage; `SECRET_FIELD_FORBIDDEN` / `SECRET_LEAK_FORBIDDEN` / `RAW_CALLBACK_SECRET_MATERIAL_FORBIDDEN` / `RAW_PAYLOAD_MATERIAL_FORBIDDEN` under Law VI.
6. Refuse live outbound delivery mutation, live HTTP egress endpoints, wall-clock authority, tip-refresh authority, FD/FE/EB/L36/FG elevate-as-port, tip-refresh, PRODUCTION_READY flip, L30–L39 reopen, L40 auto-close, schema-json add, Fundacion writes, GHE, mass prune.
7. Soft-observe freeze pinShort `1079bddf` (FE merge #553 / tip-refresh #554) only — do **not** rewrite freeze/matrix/m4 tip. Tip-refresh post-FF is SEPARATE.
8. Hermetic tests FF1–FA17; patcher `scripts/patch-mission-ff.mjs`; OpenSpec `eos-ladder-40-mission-ff`.

## Alternatives Considered AND REJECTED

- Elevating FD outbound delivery registry / FE outbound callback authenticity / EB dead-letter / L36 admission as the FF port — REJECTED: FF is quarantine/retry-deny only; fold concepts; do not reopen L34/L36.
- Live outbound delivery mutation / live HTTP egress endpoints / Date.now as authority / tip-refresh as authority — REJECTED: hermetic injected observedStage only.
- Sealing callback secrets / HMAC keys / raw payloads / secret-looking fields into receipts — REJECTED: Law VI absolute.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-FF is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L39 or auto-closing L39 — REJECTED (FG–FH pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.

## Consequences

- Positive: Third L39 satellite seals fail-closed outbound delivery quarantine / retry-deny governance with verifiable `FF-RCPT-*` receipts; FG–FH can compose on this surface without sealing secrets.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L39 CLOSED, L40 OPEN (Audit MEASURED; EY+FE MEASURED; FF this; FG–FH pending), freeze pin `1079bddf` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ FD/FE/EB/L36/FG ≠ live outbound delivery mutation ≠ wall-clock authority.

## Links

- Audit: ADR-0148 / Ladder 40 Maturity Gap Audit
- Prior: ADR-0149 (FD), ADR-0150 (FE)
- OpenSpec: `openspec/changes/eos-ladder-40-mission-ff/`
