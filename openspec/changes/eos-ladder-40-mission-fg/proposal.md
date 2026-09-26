# Proposal — Mission FG Outbound Delivery Honesty & Receipt Attestation Governance (SPEC-0169)

## Why

After L40 OPEN + Audit MEASURED (ADR-0148) + FD MEASURED (#551) + FE MEASURED (#553) + FF MEASURED (#555) + tip-refresh #556 soft-observe (`a7c7df8f`), Ladder 40 needs its fourth satellite: a Layer-0 port that seals opaque outbound delivery honesty attestation into `FG-RCPT-*` receipts — without live outbound delivery mutation, wall-clock authority, tip-refresh authority, sealing callback secrets/HMAC keys/raw payloads, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L39, auto-closing L40, or network writes. FD is registry/binding; FE is authenticity sign; FF is quarantine/retry-deny; FB is ingress honesty (inbound axis). FH seam-pack is the next satellite.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `outbound-delivery-honesty-attestation-receipt.js` — sealed `FG-RCPT-*` + freeze soft-observe `a7c7df8f` + attestationHold (`secretMaterialRefused` / `secretZeroHeld` / `rawCallbackSecretMaterialRefused`)
  - `outbound-delivery-honesty-attestation-policy-gate.js` — fail-closed govern preconditions + Law VI callback/HMAC/secret/raw-payload refusal
  - `outbound-delivery-honesty-attestation-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-fg-outbound-delivery-honesty-attestation.test.js` (FG1–FG17)
- CRLF-safe surgical patcher `scripts/patch-mission-fg.mjs`
- OpenSpec change, ADR-0152

## Non-goals

- Live outbound delivery mutation / live HTTP egress endpoints / wall-clock / tip-refresh authority; sealing callback secrets/HMAC/raw payloads; FD/FE/FF/FB elevate-as-port; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L40 auto-close; L30–L39 reopen; tip-refresh; CloudAgent; mass prune; FH product

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L39 | CLOSED — NEVER reopen |
| L40 | OPEN (Audit MEASURED · FD MEASURED · FE MEASURED · FF MEASURED · FG this · FH pending) |
| Axis | Sovereign Outbound Delivery & Callback Authenticity Governance Fabric |
| Freeze pin | `a7c7df8f` (FF merge #555 / tip-refresh #556; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| Law VI | held — never seal callback secrets / HMAC keys / raw payloads; opaque outbound delivery metadata + digests + stage only |
| PASS | sealed outbound delivery honesty attestation ≠ tip-refresh ≠ PRODUCTION_READY ≠ FD/FE/FF/FB |
| Tip-refresh | NOT this package (SEPARATE next) |
