# Proposal — Mission EW Credential Honesty & Handle Attestation (SPEC-0159)

## Why

After L38 OPEN + Audit MEASURED (ADR-0136) + ET/EU/EV MEASURED + tip-refresh #526 soft-observe (`376378be`), Ladder 38 needs its fourth satellite: a Layer-0 port that seals opaque credential-handle honesty attestation (binding match, digest consistency, refuse secret material) into `EW-RCPT-*` receipts — without live secret store/mutation, vault/KMS, wall-clock authority, tip-refresh authority, sealing secrets, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L37, auto-closing L38, or network writes. ET bind / EU leak-deny / EV lifecycle / ER config honesty are distinct axes.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `credential-honesty-attestation-receipt.js` — sealed `EW-RCPT-*` + freeze soft-observe `376378be` + attestationHold (`secretMaterialRefused` / `secretZeroHeld`)
  - `credential-honesty-attestation-policy-gate.js` — fail-closed govern preconditions + Law VI secret-field refusal + live-store / vault-KMS refusal
  - `credential-honesty-attestation-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-ew-credential-honesty-attestation.test.js` (EW1–EW17)
- CRLF-safe surgical patcher `scripts/patch-mission-ew.mjs`
- OpenSpec change, ADR-0140

## Non-goals

- Live secret store/mutation / vault/KMS / wall-clock / tip-refresh authority; sealing secrets; ET/EU/EV/ER/AU elevate-as-port; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L38 auto-close; L30–L37 reopen; tip-refresh; CloudAgent; mass prune; EX product

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L37 | CLOSED — NEVER reopen |
| L38 | OPEN (Audit+ET+EU+EV MEASURED · EW this · EX pending) |
| Axis | Sovereign Credential-Handle & Secret-Zero Governance Fabric |
| Freeze pin | `376378be` (EV #525 / tip-refresh #526; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| Law VI | held — never seal secrets; opaque handleId + attestationDigest + stage/verdict only |
| PASS | hermetic handle honesty attestation ≠ tip-refresh ≠ PRODUCTION_READY ≠ ET/EU/EV/ER |
| Tip-refresh | NOT this package (SEPARATE next) |
