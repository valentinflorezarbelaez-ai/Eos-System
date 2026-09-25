# Proposal — Mission EP Policy-Pack Binding & Evaluation (SPEC-0152)

## Why

After L37 OPEN + Audit MEASURED (ADR-0130) + tip-refresh #505 (`75131386`), Ladder 37 needs its first satellite: a Layer-0 port that seals policy-pack binding/evaluation governance into `EP-RCPT-*` receipts — without live remote policy engines, wall-clock authority, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L36, auto-closing L37, or network writes. Sentinel-killswitch / FDIR trip are not Layer-0 flag ports; EJ–EM / EH are distinct axes.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `policy-pack-binding-receipt.js` — sealed `EP-RCPT-*` + freeze soft-observe `75131386` + packHold
  - `policy-pack-binding-policy-gate.js` — fail-closed govern preconditions
  - `policy-pack-binding-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-ep-policy-pack-binding.test.js` (EP1–EP17)
- CRLF-safe surgical patcher `scripts/patch-mission-ep.mjs`
- OpenSpec change, ADR-0132

## Non-goals

- Live remote policy engines / wall-clock authority; EO-feature-flag-as-pack / DX-circuit-breaker-as-axis; EJ/EK/EL/EM/EH reopen; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L37 auto-close; L30–L36 reopen; tip-refresh; CloudAgent; mass prune

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L36 | CLOSED — NEVER reopen |
| L37 | OPEN (Audit MEASURED · EO MEASURED · EP this · EQ–ES pending) |
| Axis | Sovereign Configuration, Feature-Flag & Policy-Pack Governance Fabric |
| Freeze pin | `75131386` (L37 tip-open / tip-refresh #505; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | sealed feature-flag/toggle ≠ tip-refresh ≠ PRODUCTION_READY ≠ killswitch port |
| Tip-refresh | NOT this package (SEPARATE next) |
