# Proposal — Mission FD Outbound Delivery / Callback Target Registry & Binding (SPEC-0166)

## Why

After L40 OPEN + Audit MEASURED (ADR-0148) + tip-refresh #550 soft-observe (`f9a14e16`), Ladder 40 needs its first satellite: a Layer-0 port that seals opaque outbound-delivery-callback registry binding governance into `FD-RCPT-*` receipts — without live HTTP egress, wall-clock authority, tip-refresh authority, sealing webhook secrets/HMAC keys, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L39, auto-closing L39, or network writes. EY ingress registry is L39 inbound (distinct). L33 domain-event ports are outbound messaging (distinct — do not reopen). ET credential-handle is L38 (closed). FE signature-sign is the next satellite.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `outbound-delivery-callback-registry-receipt.js` — sealed `FD-RCPT-*` + freeze soft-observe `f9a14e16` + deliveryHold (`callbackSecretMaterialRefused` / `outboundSecretZeroHeld`)
  - `outbound-delivery-callback-registry-policy-gate.js` — fail-closed govern preconditions + Law VI webhook/HMAC/secret-field refusal
  - `outbound-delivery-callback-registry-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-fd-outbound-delivery-callback-registry.test.js` (FD1–FD17)
- CRLF-safe surgical patcher `scripts/patch-mission-fd.mjs`
- OpenSpec change, ADR-0149

## Non-goals

- Live HTTP egress / wall-clock / tip-refresh authority; sealing webhook secrets/HMAC; EY/ET/L33/FE elevate-as-port; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L40 auto-close; L30–L39 reopen; tip-refresh; CloudAgent; mass prune; FE–FH product

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L39 | CLOSED — NEVER reopen |
| L39 | OPEN (Audit MEASURED · EY this · FE–FH pending) |
| Axis | Sovereign Outbound Delivery & Callback Authenticity Governance Fabric |
| Freeze pin | `f9a14e16` (tip-open #549 / tip-refresh #550; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| Law VI | held — never seal callback secrets / HMAC keys / webhook secrets; opaque outbound metadata + digests only |
| PASS | sealed outbound-delivery-callback binding ≠ tip-refresh ≠ PRODUCTION_READY ≠ EY/ET/L33/FE |
| Tip-refresh | NOT this package (SEPARATE next) |
