# Proposal — Mission EO Feature-Flag & Runtime Toggle Governance (SPEC-0151)

## Why

After L37 OPEN + Audit MEASURED (ADR-0130) + tip-refresh #505 (`f333afaf`), Ladder 37 needs its first satellite: a Layer-0 port that seals feature-flag / runtime-toggle governance into `EO-RCPT-*` receipts — without live remote config SDKs, wall-clock rollout authority, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L36, auto-closing L37, or network writes. Sentinel-killswitch / FDIR trip are not Layer-0 flag ports; EJ–EM / EH are distinct axes.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `feature-flag-runtime-toggle-receipt.js` — sealed `EO-RCPT-*` + freeze soft-observe `f333afaf` + toggleHold
  - `feature-flag-runtime-toggle-policy-gate.js` — fail-closed govern preconditions
  - `feature-flag-runtime-toggle-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-eo-feature-flag-runtime-toggle.test.js` (EO1–EO17)
- CRLF-safe surgical patcher `scripts/patch-mission-eo.mjs`
- OpenSpec change, ADR-0131

## Non-goals

- Live remote config SDKs / wall-clock rollout authority; killswitch-as-port / FDIR-trip-as-axis; EJ/EK/EL/EM/EH reopen; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L37 auto-close; L30–L36 reopen; tip-refresh; CloudAgent; mass prune

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L36 | CLOSED — NEVER reopen |
| L37 | OPEN (Audit MEASURED · EO first · EP–ES pending) |
| Axis | Sovereign Configuration, Feature-Flag & Policy-Pack Governance Fabric |
| Freeze pin | `f333afaf` (L37 tip-open / tip-refresh #505; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | sealed feature-flag/toggle ≠ tip-refresh ≠ PRODUCTION_READY ≠ killswitch port |
| Tip-refresh | NOT this package (SEPARATE next) |
