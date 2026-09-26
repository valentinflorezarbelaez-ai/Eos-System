# Proposal — Mission ET Credential-Handle Registry & Binding (SPEC-0156)

## Why

After L38 OPEN + Audit MEASURED (ADR-0136) + tip-refresh #520 soft-observe (`2b747fb0`), Ladder 38 needs its first satellite: a Layer-0 port that seals opaque credential-handle registry binding governance into `ET-RCPT-*` receipts — without live secret stores, wall-clock authority, tip-refresh authority, sealing secrets, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L37, auto-closing L38, or network writes. Mission AU secret-runtime-broker is not a Layer-0 composition handle port; EO/EP/EQ/ER are distinct axes.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `credential-handle-registry-receipt.js` — sealed `ET-RCPT-*` + freeze soft-observe `2b747fb0` + handleHold (`secretMaterialRefused` / `secretZeroHeld`)
  - `credential-handle-registry-policy-gate.js` — fail-closed govern preconditions + Law VI secret-field refusal
  - `credential-handle-registry-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-et-credential-handle-registry.test.js` (ET1–ET17)
- CRLF-safe surgical patcher `scripts/patch-mission-et.mjs`
- OpenSpec change, ADR-0137

## Non-goals

- Live secret stores / wall-clock / tip-refresh authority; sealing secrets; EO/EP/AU elevate-as-port; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L38 auto-close; L30–L37 reopen; tip-refresh; CloudAgent; mass prune; EU–EX product

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L37 | CLOSED — NEVER reopen |
| L38 | OPEN (Audit MEASURED · ET this · EU–EX pending) |
| Axis | Sovereign Credential-Handle & Secret-Zero Governance Fabric |
| Freeze pin | `2b747fb0` (tip-open #519 / tip-refresh #520; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| Law VI | held — never seal secrets; opaque handle metadata + digests only |
| PASS | sealed credential-handle binding ≠ tip-refresh ≠ PRODUCTION_READY ≠ AU broker |
| Tip-refresh | NOT this package (SEPARATE next) |
