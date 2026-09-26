# Proposal — Mission EZ Webhook Authenticity / Signature-Verify Governance (SPEC-0162)

## Why

After L39 OPEN + Audit MEASURED (ADR-0142) + EY MEASURED (#536) + tip-refresh #537 soft-observe (`cc9161f9`), Ladder 39 needs its second satellite: a Layer-0 port that seals opaque webhook authenticity verify governance into `EZ-RCPT-*` receipts — without live signature verify endpoints, wall-clock authority, tip-refresh authority, sealing webhook secrets/HMAC keys, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L38, auto-closing L39, or network writes. L33 domain-event ports are outbound (distinct — do not reopen). ET credential-handle is L38 (closed). EZ webhook authenticity is the next satellite.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `webhook-authenticity-receipt.js` — sealed `EZ-RCPT-*` + freeze soft-observe `cc9161f9` + authenticityHold (`webhookSecretMaterialRefused` / `authenticitySecretZeroHeld`)
  - `webhook-authenticity-policy-gate.js` — fail-closed govern preconditions + Law VI webhook/HMAC/secret-field refusal
  - `webhook-authenticity-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-ez-webhook-authenticity.test.js` (EY1–EY17)
- CRLF-safe surgical patcher `scripts/patch-mission-ez.mjs`
- OpenSpec change, ADR-0144

## Non-goals

- Live webhook endpoints / wall-clock / tip-refresh authority; sealing webhook secrets/HMAC; ET/EY/AU/FA elevate-as-port; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L39 auto-close; L30–L38 reopen; tip-refresh; CloudAgent; mass prune; EZ–FC product

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L38 | CLOSED — NEVER reopen |
| L39 | OPEN (Audit MEASURED · EY MEASURED · EZ this · FA–FC pending) |
| Axis | Sovereign External Event Ingress & Webhook Authenticity Governance Fabric |
| Freeze pin | `cc9161f9` (EY merge #536 / tip-refresh #537; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| Law VI | held — never seal webhook secrets / HMAC keys; opaque ingress metadata + digests only |
| PASS | sealed webhook-authenticity verify ≠ tip-refresh ≠ PRODUCTION_READY ≠ ET/EY/AU/FA |
| Tip-refresh | NOT this package (SEPARATE next) |
