# Proposal — Mission FF Outbound Delivery Quarantine / Retry-Deny Governance (SPEC-0168)

## Why

After L40 OPEN + Audit MEASURED (ADR-0148) + FD MEASURED (#551) + FE MEASURED (#553) + tip-refresh #554 soft-observe (`1079bddf`), Ladder 40 needs its third satellite: a Layer-0 port that seals opaque outbound delivery quarantine / retry-deny / ordering governance into `FF-RCPT-*` receipts — without live outbound delivery mutation, wall-clock authority, tip-refresh authority, sealing callback secrets/HMAC keys/raw payloads, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L39, auto-closing L39, or network writes. EY is registry/binding; EZ is authenticity verify; EB dead-letter (L34) and L36 admission are distinct (fold concepts; do not reopen). FG honesty is the next satellite.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `outbound-delivery-quarantine-retry-deny-receipt.js` — sealed `FF-RCPT-*` + freeze soft-observe `1079bddf` + quarantineHold (`callbackSecretMaterialRefused` / `quarantineSecretZeroHeld`)
  - `outbound-delivery-quarantine-retry-deny-policy-gate.js` — fail-closed govern preconditions + Law VI callback/HMAC/secret/raw-payload refusal
  - `outbound-delivery-quarantine-retry-deny-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-ff-outbound-delivery-quarantine-retry-deny.test.js` (FF1–FA17)
- CRLF-safe surgical patcher `scripts/patch-mission-ff.mjs`
- OpenSpec change, ADR-0151

## Non-goals

- Live outbound delivery mutation / live HTTP egress endpoints / wall-clock / tip-refresh authority; sealing callback secrets/HMAC/raw payloads; FD/FE/EB/L36/FG elevate-as-port; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L40 auto-close; L30–L39 reopen; tip-refresh; CloudAgent; mass prune; FG–FH product

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L39 | CLOSED — NEVER reopen |
| L39 | OPEN (Audit MEASURED · FD MEASURED · FE MEASURED · FF this · FG–FH pending) |
| Axis | Sovereign Outbound Delivery & Callback Authenticity Governance Fabric |
| Freeze pin | `1079bddf` (FE merge #553 / tip-refresh #554; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| Law VI | held — never seal callback secrets / HMAC keys / raw payloads; opaque outbound delivery metadata + digests + stage only |
| PASS | sealed outbound delivery quarantine/retry-deny ≠ tip-refresh ≠ PRODUCTION_READY ≠ FD/FE/EB/L36/FG |
| Tip-refresh | NOT this package (SEPARATE next) |
