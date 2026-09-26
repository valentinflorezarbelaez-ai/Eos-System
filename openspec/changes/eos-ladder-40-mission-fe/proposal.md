# Proposal — Mission FE Outbound Callback Authenticity / Signature-Sign (SPEC-0167)

## Why

After L40 OPEN + Audit MEASURED (ADR-0148) + FD MEASURED (#551) + tip-refresh #552 soft-observe (`7b47bf8b`), Ladder 40 needs its second satellite — **symmetric to Mission EZ** (SPEC-0162 / inbound verify): a Layer-0 port that seals opaque outbound-callback authenticity **sign** governance into `FE-RCPT-*` receipts using L38 `handleId`s only — without live HTTP egress / live crypto binding, wall-clock authority, tip-refresh authority, sealing callback secrets/HMAC/signing keys, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L39, auto-closing L40, or network writes. FD is registry/binding only (soft-observe `targetId`/`deliveryId`). EZ verifies inbound (distinct). FF quarantine is next — do not implement.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `outbound-callback-authenticity-receipt.js` — sealed `FE-RCPT-*` + freeze soft-observe `7b47bf8b` + authenticityHold (`callbackSecretMaterialRefused` / `authenticitySecretZeroHeld`)
  - `outbound-callback-authenticity-policy-gate.js` — fail-closed govern preconditions + Law VI callback/HMAC/signing-key/secret-field refusal
  - `outbound-callback-authenticity-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-fe-outbound-callback-authenticity.test.js` (FE1–FE17)
- CRLF-safe surgical patcher `scripts/patch-mission-fe.mjs`
- OpenSpec change, ADR-0150

## Non-goals

- Live signature sign endpoint / wall-clock / tip-refresh authority; sealing callback secrets/HMAC/signing keys; FD/EZ/ET/AU/FF elevate-as-port; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L40 auto-close; L30–L39 reopen; tip-refresh; CloudAgent; mass prune; FF–FH product

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L39 | CLOSED — NEVER reopen |
| L40 | OPEN (Audit MEASURED · FD MEASURED · FE this · FF–FH pending) |
| Axis | Sovereign Outbound Delivery & Callback Authenticity Governance Fabric |
| Freeze pin | `7b47bf8b` (FD merge #551 / tip-refresh #552; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| Law VI | held — never seal callback secrets / HMAC keys / webhook secrets / signing keys; opaque outbound metadata + digests only |
| PASS | sealed outbound-callback-authenticity sign ≠ tip-refresh ≠ PRODUCTION_READY ≠ ET/EZ/FD/AU/FF |
| Tip-refresh | NOT this package (SEPARATE next) |
