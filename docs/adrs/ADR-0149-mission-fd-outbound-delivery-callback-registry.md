# ADR-0149 — Mission FD Outbound Delivery / Callback Target Registry & Binding Port

- **Status:** Accepted — local governed (Ladder 40 / Mission FD)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Outbound Delivery & Callback Authenticity Governance Fabric)
- **Spec:** SPEC-0166
- **Prior ADRs:** ADR-0148 (Ladder 40 Maturity Gap Audit), ADR-0147 (Mission FC L39 Closeout)

## Context

Ladder 40 is **OPEN** (tip-open #549 + tip-refresh #550 soft-observe; freeze soft-observe pin `f9a14e16`). Formal L30–L39 remain **CLOSED** — **NEVER reopen**. Ladder 38 sealed credential-handle registry → secret-zero → lifecycle → honesty → seam-pack, but there is **no** Layer-0 outbound delivery / callback target registry or opaque outbound binding surface under `src/core/composition/`. L39 EY sealed inbound external-event-ingress registry (distinct). L33 domain-event ports are outbound messaging (≠ signed HTTP callback target registry) — distinct; do **not** reopen. Mission FE (callback authenticity / signature-sign) is the **next** satellite — FD is registry/binding only.

This ADR accepts Mission FD as the first L40 satellite: a hermetic Outbound Delivery / Callback Target Registry & Binding Port that seals `FD-RCPT-*` receipts with `deliveryDigest` over opaque target/delivery metadata only. Tip-refresh post-FD is **SEPARATE** and must not land in this package. Law VI is absolute — refuse callback secrets, HMAC keys, webhook secrets, raw secret-looking payloads; never seal secrets.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `outbound-delivery-callback-registry-receipt.js` — sealed `FD-RCPT-*` + freeze soft-observe `f9a14e16` + `deliveryHold` (`callbackSecretMaterialRefused` / `outboundSecretZeroHeld`)
   - `outbound-delivery-callback-registry-policy-gate.js` — fail-closed govern preconditions + Law VI callback/HMAC/webhook/secret-field refusal
   - `outbound-delivery-callback-registry-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `OUTBOUND_DELIVERY_CALLBACK_REGISTRY_BINDING`.
3. Binding requires opaque `targetId` + `deliveryId` + `targetClass` + `desiredBinding` (`BOUND|UNBOUND|HOLD`); optional hermetic `observedBinding`; `authorized` must be `true` for PASS.
4. Digest field: `deliveryDigest` (sha256 of opaque outbound metadata only — never secret/HMAC raw material).
5. Fail-closed `DENY` + code `BINDING_UNAUTHORIZED` when unauthorized; `INVALID_BINDING_CLAIM` when hermetic observedBinding mismatches desiredBinding; `SECRET_FIELD_FORBIDDEN` / `SECRET_LEAK_FORBIDDEN` / `RAW_CALLBACK_SECRET_MATERIAL_FORBIDDEN` under Law VI.
6. Refuse live HTTP egress, wall-clock authority, tip-refresh authority, EY/ET/L33/FE elevate-as-port, tip-refresh, PRODUCTION_READY flip, L30–L39 reopen, L40 auto-close, schema-json add, Fundacion writes, GHE, mass prune.
7. Soft-observe freeze pinShort `f9a14e16` only — do **not** rewrite freeze/matrix/m4 tip.
8. Hermetic tests FD1–FD17; patcher `scripts/patch-mission-fd.mjs`; OpenSpec `eos-ladder-40-mission-fd`.

## Alternatives Considered AND REJECTED

- Elevating ET credential-handle / L33 domain-event outbound / EZ webhook authenticity as the EY port — REJECTED: EY is outbound registry bind only; FE is next.
- Live HTTP egress / Date.now as authority / tip-refresh as authority — REJECTED: hermetic injected observedBinding only.
- Sealing callback secrets / HMAC keys / webhook secrets / secret-looking fields into receipts — REJECTED: Law VI absolute.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-FD is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L39 or auto-closing L39 — REJECTED (FE–FH pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.

## Consequences

- Positive: First L40 satellite seals fail-closed outbound-delivery-callback registry binding governance with verifiable `FD-RCPT-*` receipts; FE–FG can compose on this surface without sealing secrets.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L39 CLOSED, L40 OPEN (Audit MEASURED; EY this; FE–FH pending), freeze pin `f9a14e16` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ EY/ET/L33/Canary/FE ≠ live HTTP egress ≠ wall-clock authority.

## Links

- Audit: ADR-0148 / Ladder 40 Maturity Gap Audit
- OpenSpec: `openspec/changes/eos-ladder-40-mission-fd/`
- Mirror: Mission EY SPEC-0161 / ADR-0143 (inbound ingress registry)
