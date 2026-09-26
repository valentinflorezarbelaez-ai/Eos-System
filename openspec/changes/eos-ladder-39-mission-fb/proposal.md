# Proposal — Mission FB Ingress Honesty & Attestation Governance (SPEC-0164)

## Why

After L39 OPEN + Audit MEASURED (ADR-0142) + EY MEASURED (#536) + EZ MEASURED (#538) + FA MEASURED (#540) + tip-refresh post-#540 soft-observe (`57edb92e`), Ladder 39 needs its fourth satellite: a Layer-0 port that seals opaque ingress honesty attestation into `FB-RCPT-*` receipts — without live ingress mutation, wall-clock authority, tip-refresh authority, sealing webhook secrets/HMAC keys/raw payloads, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L38, auto-closing L39, or network writes. EY is registry/binding; EZ is authenticity verify; FA is quarantine/replay-deny; EW/ER/EH/EM are other honesty axes (fold concepts; do not reopen). FC seam-pack is next SEPARATE.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `ingress-honesty-attestation-receipt.js` — sealed `FB-RCPT-*` + freeze soft-observe `57edb92e` + attestationHold
  - `ingress-honesty-attestation-policy-gate.js` — fail-closed govern preconditions + Law VI webhook/HMAC/secret/raw-payload refusal
  - `ingress-honesty-attestation-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-fb-ingress-honesty-attestation.test.js` (FB1–FB17)
- CRLF-safe surgical patcher `scripts/patch-mission-fb.mjs`
- OpenSpec change, ADR-0146

## Non-goals

- Live ingress mutation / live webhook endpoints / wall-clock / tip-refresh authority; sealing webhook secrets/HMAC/raw payloads; EY/EZ/FA/EW/ER/EH/EM elevate-as-port; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L39 auto-close; L30–L38 reopen; tip-refresh; CloudAgent; mass prune; FC product

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L38 | CLOSED — NEVER reopen |
| L39 | OPEN (Audit MEASURED · EY MEASURED · EZ MEASURED · FA MEASURED · FB this · FC pending) |
| Axis | Sovereign External Event Ingress & Webhook Authenticity Governance Fabric |
| Freeze pin | `57edb92e` (tip-refresh post-#540; soft-observe only — NOT rewritten) |
| Ceiling | schemas AT_CEILING 35/35 |
| Law VI | held — never seal webhook secrets / HMAC keys / raw payloads; opaque ingress metadata + digests + stage only |
| PASS | hermetic ingress honesty attestation ≠ tip-refresh ≠ PRODUCTION_READY ≠ EY/EZ/FA/EW/ER/EH/EM |
| Tip-refresh | NOT this package (SEPARATE next) |
