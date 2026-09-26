# Proposal — Mission EV Credential Handle Lifecycle / Rotation (SPEC-0158)

## Why

After L38 OPEN + Audit MEASURED (ADR-0136) + ET MEASURED + EU MEASURED + tip-refresh #524 soft-observe (`0eace5df`), Ladder 38 needs its third satellite: a Layer-0 port that seals opaque credential-handle lifecycle / rotation (STAGED_ROTATE|ROTATE|REVOKE|HOLD|ROLLBACK_HOLD) into `EV-RCPT-*` receipts — without live secret mutation, vault/KMS, wall-clock authority, tip-refresh authority, sealing secrets, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L37, auto-closing L38, or network writes. ET bind / EU leak-deny / EQ config staged activation are distinct axes (config ≠ credential handle lifecycle).

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `credential-handle-lifecycle-receipt.js` — sealed `EV-RCPT-*` + freeze soft-observe `0eace5df` + lifecycleHold (`secretMaterialRefused` / `secretZeroHeld`)
  - `credential-handle-lifecycle-policy-gate.js` — fail-closed govern preconditions + Law VI secret-field refusal + live-mutation / vault-KMS refusal
  - `credential-handle-lifecycle-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-ev-credential-handle-lifecycle.test.js` (EV1–EV17)
- CRLF-safe surgical patcher `scripts/patch-mission-ev.mjs`
- OpenSpec change, ADR-0139

## Non-goals

- Live secret mutation / vault/KMS / wall-clock / tip-refresh authority; sealing secrets; new plaintext credentials on rotate; ET/EU/EQ elevate-as-port; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L38 auto-close; L30–L37 reopen; tip-refresh; CloudAgent; mass prune; EW–EX product

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L37 | CLOSED — NEVER reopen |
| L38 | OPEN (Audit+ET+EU MEASURED · EV this · EW–EX pending) |
| Axis | Sovereign Credential-Handle & Secret-Zero Governance Fabric |
| Freeze pin | `0eace5df` (EU #523 / tip-refresh #524; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| Law VI | held — never seal secrets; opaque handleId + lifecycleDigest + stage only |
| PASS | sealed handle lifecycle ≠ tip-refresh ≠ PRODUCTION_READY ≠ ET/EU/EQ |
| Tip-refresh | NOT this package (SEPARATE next) |
