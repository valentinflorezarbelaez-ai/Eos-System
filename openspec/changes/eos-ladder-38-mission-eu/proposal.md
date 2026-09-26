# Proposal — Mission EU Secret-Zero Leak-Deny & Redaction (SPEC-0157)

## Why

After L38 OPEN + Audit MEASURED (ADR-0136) + tip-refresh #520 soft-observe (`bc24c17b`), Ladder 38 needs its first satellite: a Layer-0 port that seals opaque secret-zero leak-deny / redaction governance into `EU-RCPT-*` receipts — without live secret stores, wall-clock authority, tip-refresh authority, sealing secrets, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L37, auto-closing L38, or network writes. Mission AU secret-runtime-broker is not a Layer-0 composition handle port; EO/EP/EQ/ER are distinct axes.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `secret-zero-leak-deny-receipt.js` — sealed `EU-RCPT-*` + freeze soft-observe `bc24c17b` + leakHold (`secretMaterialRefused` / `secretZeroHeld`)
  - `secret-zero-leak-deny-policy-gate.js` — fail-closed govern preconditions + Law VI secret-field refusal
  - `secret-zero-leak-deny-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-eu-secret-zero-leak-deny.test.js` (ET1–ET17)
- CRLF-safe surgical patcher `scripts/patch-mission-eu.mjs`
- OpenSpec change, ADR-0138

## Non-goals

- Live secret stores / wall-clock / tip-refresh authority; sealing secrets; EO/EP/AU elevate-as-port; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L38 auto-close; L30–L37 reopen; tip-refresh; CloudAgent; mass prune; EU–EX product

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L37 | CLOSED — NEVER reopen |
| L38 | OPEN (Audit MEASURED · ET this · EV–EX pending) |
| Axis | Sovereign Credential-Handle & Secret-Zero Governance Fabric |
| Freeze pin | `bc24c17b` (tip-open #519 / tip-refresh #520; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| Law VI | held — never seal secrets; opaque handle metadata + digests only |
| PASS | sealed credential-handle binding ≠ tip-refresh ≠ PRODUCTION_READY ≠ AU broker |
| Tip-refresh | NOT this package (SEPARATE next) |
