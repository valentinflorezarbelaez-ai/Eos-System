# Proposal — Mission EY External Event Ingress Registry & Binding (SPEC-0161)

## Why

After L39 OPEN + Audit MEASURED (ADR-0142) + tip-refresh #535 soft-observe (`987702da`), Ladder 39 needs its first satellite: a Layer-0 port that seals opaque external-event-ingress registry binding governance into `EY-RCPT-*` receipts — without live webhook endpoints, wall-clock authority, tip-refresh authority, sealing webhook secrets/HMAC keys, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L38, auto-closing L39, or network writes. L33 domain-event ports are outbound (distinct — do not reopen). ET credential-handle is L38 (closed). EZ webhook authenticity is the next satellite.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `external-event-ingress-registry-receipt.js` — sealed `EY-RCPT-*` + freeze soft-observe `987702da` + ingressHold (`webhookSecretMaterialRefused` / `ingressSecretZeroHeld`)
  - `external-event-ingress-registry-policy-gate.js` — fail-closed govern preconditions + Law VI webhook/HMAC/secret-field refusal
  - `external-event-ingress-registry-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-ey-external-event-ingress-registry.test.js` (EY1–EY17)
- CRLF-safe surgical patcher `scripts/patch-mission-ey.mjs`
- OpenSpec change, ADR-0143

## Non-goals

- Live webhook endpoints / wall-clock / tip-refresh authority; sealing webhook secrets/HMAC; ET/L33/EZ elevate-as-port; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L39 auto-close; L30–L38 reopen; tip-refresh; CloudAgent; mass prune; EZ–FC product

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L38 | CLOSED — NEVER reopen |
| L39 | OPEN (Audit MEASURED · EY this · EZ–FC pending) |
| Axis | Sovereign External Event Ingress & Webhook Authenticity Governance Fabric |
| Freeze pin | `987702da` (tip-open #533 / tip-refresh #535; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| Law VI | held — never seal webhook secrets / HMAC keys; opaque ingress metadata + digests only |
| PASS | sealed external-event-ingress binding ≠ tip-refresh ≠ PRODUCTION_READY ≠ ET/L33/EZ |
| Tip-refresh | NOT this package (SEPARATE next) |
