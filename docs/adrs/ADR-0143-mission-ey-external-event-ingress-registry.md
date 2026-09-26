# ADR-0143 — Mission EY External Event Ingress Registry & Binding Port

- **Status:** Accepted — local governed (Ladder 39 / Mission EY)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign External Event Ingress & Webhook Authenticity Governance Fabric)
- **Spec:** SPEC-0161
- **Prior ADRs:** ADR-0142 (Ladder 39 Maturity Gap Audit), ADR-0141 (Mission EX L38 Closeout)

## Context

Ladder 39 is **OPEN** (tip-open #533 + tip-refresh #535 soft-observe; freeze soft-observe pin `987702da`). Formal L30–L38 remain **CLOSED** — **NEVER reopen**. Ladder 38 sealed credential-handle registry → secret-zero → lifecycle → honesty → seam-pack, but there is **no** Layer-0 external event ingress registry or opaque ingress binding surface under `src/core/composition/`. L33 domain-event ports are **outbound** — distinct; do **not** reopen. Mission EZ (webhook authenticity / signature-verify) is the **next** satellite — EY is registry/binding only.

This ADR accepts Mission EY as the first L39 satellite: a hermetic External Event Ingress Registry & Binding Port that seals `EY-RCPT-*` receipts with `ingressDigest` over opaque ingress/source metadata only. Tip-refresh post-EY is **SEPARATE** and must not land in this package. Law VI is absolute — refuse webhook secrets, HMAC keys, raw secret-looking payloads; never seal secrets.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `external-event-ingress-registry-receipt.js` — sealed `EY-RCPT-*` + freeze soft-observe `987702da` + `ingressHold` (`webhookSecretMaterialRefused` / `ingressSecretZeroHeld`)
   - `external-event-ingress-registry-policy-gate.js` — fail-closed govern preconditions + Law VI webhook/HMAC/secret-field refusal
   - `external-event-ingress-registry-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `EXTERNAL_EVENT_INGRESS_REGISTRY_BINDING`.
3. Binding requires opaque `ingressId` + `sourceId` + `sourceClass` + `desiredBinding` (`BOUND|UNBOUND|HOLD`); optional hermetic `observedBinding`; `authorized` must be `true` for PASS.
4. Digest field: `ingressDigest` (sha256 of opaque ingress metadata only — never secret/HMAC raw material).
5. Fail-closed `DENY` + code `BINDING_UNAUTHORIZED` when unauthorized; `INVALID_BINDING_CLAIM` when hermetic observedBinding mismatches desiredBinding; `SECRET_FIELD_FORBIDDEN` / `SECRET_LEAK_FORBIDDEN` / `RAW_WEBHOOK_SECRET_MATERIAL_FORBIDDEN` under Law VI.
6. Refuse live webhook endpoints, wall-clock authority, tip-refresh authority, ET/L33/EZ elevate-as-port, tip-refresh, PRODUCTION_READY flip, L30–L38 reopen, L39 auto-close, schema-json add, Fundacion writes, GHE, mass prune.
7. Soft-observe freeze pinShort `987702da` only — do **not** rewrite freeze/matrix/m4 tip.
8. Hermetic tests EY1–EY17; patcher `scripts/patch-mission-ey.mjs`; OpenSpec `eos-ladder-39-mission-ey`.

## Alternatives Considered AND REJECTED

- Elevating ET credential-handle / L33 domain-event outbound / EZ webhook authenticity as the EY port — REJECTED: EY is ingress registry bind only; EZ is next.
- Live webhook endpoints / Date.now as authority / tip-refresh as authority — REJECTED: hermetic injected observedBinding only.
- Sealing webhook secrets / HMAC keys / secret-looking fields into receipts — REJECTED: Law VI absolute.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-EY is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L38 or auto-closing L39 — REJECTED (EZ–FC pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.

## Consequences

- Positive: First L39 satellite seals fail-closed external-event-ingress registry binding governance with verifiable `EY-RCPT-*` receipts; EZ–FB can compose on this surface without sealing secrets.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L38 CLOSED, L39 OPEN (Audit MEASURED; EY this; EZ–FC pending), freeze pin `987702da` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ ET/L33/EZ ≠ live webhook endpoint ≠ wall-clock authority.

## Links

- Audit: ADR-0142 / Ladder 39 Maturity Gap Audit
- OpenSpec: `openspec/changes/eos-ladder-39-mission-ey/`
