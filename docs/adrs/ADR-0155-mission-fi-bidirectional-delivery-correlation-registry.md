# ADR-0155 — Mission FI Bidirectional Delivery Correlation Registry & Binding Port

- **Status:** Accepted — local governed (Ladder 41 / Mission FI)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric)
- **Spec:** SPEC-0171
- **Prior ADRs:** ADR-0154 (Ladder 41 Maturity Gap Audit), ADR-0149 (Mission FD Outbound Registry), ADR-0143 (Mission EY Ingress Registry)

## Context

Ladder 41 is **OPEN** (tip-open #564 + tip-refresh #565 soft-observe; freeze soft-observe pin `78141c3d`). Formal L30–L40 remain **CLOSED** — **NEVER reopen**. L39 EY sealed inbound external-event-ingress registry; L40 FD sealed outbound-delivery-callback registry — but there is **no** Layer-0 bidirectional correlation / binding surface that joins opaque L39 ingress refs ↔ L40 outbound refs under `src/core/composition/`. Mission FJ (round-trip integrity) is the **next** satellite — FI is registry/binding only.

This ADR accepts Mission FI as the first L41 satellite: a hermetic Bidirectional Delivery Correlation Registry & Binding Port that seals `FI-RCPT-*` receipts with `correlationDigest` over opaque ingressRef+outboundRef metadata only. Tip-refresh post-FI is **SEPARATE** and must not land in this package. Law VI is absolute — refuse correlation secrets, raw payloads, secret-looking fields; never seal secrets. Soft-observe L39/L40 opaque ids only — do **not** reopen those ladders.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `bidirectional-delivery-correlation-registry-receipt.js` — sealed `FI-RCPT-*` + freeze soft-observe `78141c3d` + `correlationHold` (`correlationSecretMaterialRefused` / `correlationSecretZeroHeld`)
   - `bidirectional-delivery-correlation-registry-policy-gate.js` — fail-closed govern preconditions + Law VI correlation/secret-field refusal
   - `bidirectional-delivery-correlation-registry-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `BIDIRECTIONAL_DELIVERY_CORRELATION_REGISTRY_BINDING`.
3. Binding requires opaque `correlationId` + `ingressId` + `sourceId` (L39 soft-observe) + `targetId` + `deliveryId` (L40 soft-observe) + `correlationClass` + `desiredBinding` (`BOUND|UNBOUND|HOLD`); optional hermetic `observedBinding` / `bindingId`; `authorized` must be `true` for PASS.
4. Digest field: `correlationDigest` (sha256 of opaque ingressRef+outboundRef metadata only — never secret/raw payload material).
5. Fail-closed `DENY` + code `BINDING_UNAUTHORIZED` when unauthorized; `INVALID_BINDING_CLAIM` when hermetic observedBinding mismatches desiredBinding; `SECRET_FIELD_FORBIDDEN` / `SECRET_LEAK_FORBIDDEN` / `RAW_CORRELATION_SECRET_MATERIAL_FORBIDDEN` under Law VI.
6. Refuse live HTTP egress, wall-clock authority, tip-refresh authority, EY/FD/FJ elevate-as-port, tip-refresh, PRODUCTION_READY flip, L30–L40 reopen, L41 auto-close, schema-json add, Fundacion writes, GHE, mass prune.
7. Soft-observe freeze pinShort `78141c3d` only — do **not** rewrite freeze/matrix/m4 tip.
8. Hermetic tests FI1–FI17; patcher `scripts/patch-mission-fi.mjs`; OpenSpec `eos-ladder-41-mission-fi`.

## Alternatives Considered AND REJECTED

- Elevating EY ingress / FD outbound / FJ round-trip as the FI port — REJECTED: FI is correlation registry bind only; FJ is next.
- Live HTTP egress / Date.now as authority / tip-refresh as authority — REJECTED: hermetic injected observedBinding only.
- Sealing correlation secrets / raw payloads / secret-looking fields into receipts — REJECTED: Law VI absolute.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-FI is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L40 or auto-closing L41 — REJECTED (FJ–FM pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.

## Consequences

- Positive: First L41 satellite seals fail-closed bidirectional-delivery-correlation registry binding governance with verifiable `FI-RCPT-*` receipts; FJ–FL can compose on this surface without sealing secrets or reopening L39/L40.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L40 CLOSED, L41 OPEN (Audit MEASURED; FI this; FJ–FM pending), freeze pin `78141c3d` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ EY/FD/FJ/Canary ≠ live HTTP egress ≠ wall-clock authority.

## Links

- Audit: ADR-0154 / Ladder 41 Maturity Gap Audit
- OpenSpec: `openspec/changes/eos-ladder-41-mission-fi/`
- Mirror: Mission EY SPEC-0161 / ADR-0143 (ingress); Mission FD SPEC-0166 / ADR-0149 (outbound)
