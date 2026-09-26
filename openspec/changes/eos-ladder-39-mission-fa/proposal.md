# Proposal — Mission FA Ingress Quarantine / Replay-Deny Governance (SPEC-0163)

## Why

After L39 OPEN + Audit MEASURED (ADR-0142) + EY MEASURED (#536) + EZ MEASURED (#538) + tip-refresh #539 soft-observe (`3cbb32dc`), Ladder 39 needs its third satellite: a Layer-0 port that seals opaque ingress quarantine / replay-deny / ordering governance into `FA-RCPT-*` receipts — without live ingress mutation, wall-clock authority, tip-refresh authority, sealing webhook secrets/HMAC keys/raw payloads, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L38, auto-closing L39, or network writes. EY is registry/binding; EZ is authenticity verify; EB dead-letter (L34) and L36 admission are distinct (fold concepts; do not reopen). FB honesty is the next satellite.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `ingress-quarantine-replay-deny-receipt.js` — sealed `FA-RCPT-*` + freeze soft-observe `3cbb32dc` + quarantineHold (`webhookSecretMaterialRefused` / `quarantineSecretZeroHeld`)
  - `ingress-quarantine-replay-deny-policy-gate.js` — fail-closed govern preconditions + Law VI webhook/HMAC/secret/raw-payload refusal
  - `ingress-quarantine-replay-deny-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-fa-ingress-quarantine-replay-deny.test.js` (FA1–FA17)
- CRLF-safe surgical patcher `scripts/patch-mission-fa.mjs`
- OpenSpec change, ADR-0145

## Non-goals

- Live ingress mutation / live webhook endpoints / wall-clock / tip-refresh authority; sealing webhook secrets/HMAC/raw payloads; EY/EZ/EB/L36/FB elevate-as-port; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L39 auto-close; L30–L38 reopen; tip-refresh; CloudAgent; mass prune; FB–FC product

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L38 | CLOSED — NEVER reopen |
| L39 | OPEN (Audit MEASURED · EY MEASURED · EZ MEASURED · FA this · FB–FC pending) |
| Axis | Sovereign External Event Ingress & Webhook Authenticity Governance Fabric |
| Freeze pin | `3cbb32dc` (EZ merge #538 / tip-refresh #539; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| Law VI | held — never seal webhook secrets / HMAC keys / raw payloads; opaque ingress metadata + digests + stage only |
| PASS | sealed ingress quarantine/replay-deny ≠ tip-refresh ≠ PRODUCTION_READY ≠ EY/EZ/EB/L36/FB |
| Tip-refresh | NOT this package (SEPARATE next) |
