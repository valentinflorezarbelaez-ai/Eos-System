# Proposal — Mission EQ Config Change / Staged Activation Governance (SPEC-0153)

## Why

After L37 OPEN + Audit MEASURED (ADR-0130) + EO MEASURED + EP MEASURED + tip-refresh #509 (`748000c3`), Ladder 37 needs its third satellite: a Layer-0 port that seals staged config/flag activation change governance into `EQ-RCPT-*` receipts — without live unsupervised mutation, wall-clock authority, remote config push, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L36, auto-closing L37, or network writes. EO feature-flag / EP policy-pack are distinct axes; EJ–EM / EG / EH likewise distinct.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `config-staged-activation-receipt.js` — sealed `EQ-RCPT-*` + freeze soft-observe `748000c3` + activationHold
  - `config-staged-activation-policy-gate.js` — fail-closed govern preconditions
  - `config-staged-activation-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-eq-config-staged-activation.test.js` (EQ1–EQ17)
- CRLF-safe surgical patcher `scripts/patch-mission-eq.mjs`
- OpenSpec change, ADR-0133

## Non-goals

- Live unsupervised mutation / wall-clock authority / remote config push / tip-refresh authority; EO-feature-flag-as-activation / EP-policy-pack-as-activation / DX-circuit-breaker-as-axis; EJ/EK/EG/EH reopen; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L37 auto-close; L30–L36 reopen; tip-refresh; CloudAgent; mass prune

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L36 | CLOSED — NEVER reopen |
| L37 | OPEN (Audit MEASURED · EO MEASURED · EP MEASURED · EQ this · ER–ES pending) |
| Axis | Config Change / Staged Activation Governance Port |
| Freeze pin | `748000c3` (EP #508 merge / EXPECTED_TIP after tip-refresh #509; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | sealed staged-activation ≠ tip-refresh ≠ PRODUCTION_READY ≠ EO flag ≠ EP pack |
| Tip-refresh | NOT this package (SEPARATE next) |
