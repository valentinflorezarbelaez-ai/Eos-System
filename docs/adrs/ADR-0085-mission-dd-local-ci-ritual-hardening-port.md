# ADR-0085 — Mission DD Local CI Ritual Hardening Port

- **Status:** Accepted — local governed (Ladder 29 Satellite 3)
- **Date:** 2026-09-21
- **Deciders:** EOS local governed use (Sovereign Observability & Evidence Economy Fabric)
- **Spec:** SPEC-0113
- **Prior ADR:** ADR-0083 (Mission DB Doctor Ritual Automation Port)

## Context

Ladder 28 is **CLOSED_FOR_LOCAL_GOVERNED_USE** (CV–CZ MEASURED; never reopen). Ladder 29 audit (ADR-0081 / #401) declared axis **Sovereign Observability & Evidence Economy Fabric**. Mission DA (SPEC-0110 / ADR-0082) MEASURED via #403 @ `daae7380`. Mission DB (SPEC-0111 / ADR-0083) MEASURED via #405 @ `22d80bce`. Mission DC (SPEC-0112 / ADR-0084) MEASURED via #407 @ `4d8c6c59`. Freeze soft-observe pin for this package is **`4d8c6c59`** (DC MEASURED) until tip-refresh — ≠ tip rewrite in product package.

Operators need a Layer-0 **Local CI Ritual Hardening** port that governs evidence-economy / local-ci-ritual-hardening ritual plans with honesty, soft-composing DA+DB+DC observe when present and soft-observing L28 honesty labels (CV/CW/CX/CY), sealing `DD-RCPT-*` receipts.

Schemas remain **AT_CEILING 35/35** — do not add `docs/schemas/**/*.json`.

## Decision

1. Implement three Layer-0 modules under `src/core/composition/`:
   - `local-ci-ritual-hardening-receipt.js`: Nine-field SHA-256 sealed `DD-RCPT-*` with forced freeze soft-observe `{ pin: 4d8c6c59, readOnly: true, tipRewriteRefused, productionReadyFlipRefused, nonClaimLabels[] }`.
   - `local-ci-ritual-hardening-policy-gate.js`: Fail-closed plan validation (Fundacion Δ=0, Law VI, PRODUCTION_READY flip / tip-pin rewrite / L28 reopen / GHE / auto-close L29 / external APM refuse; require **DA+DB+DC** observe labels).
   - `local-ci-ritual-hardening-port.js`: `govern` / `evaluate` / `getDecision` / `verifyTrail`; soft-observe freeze NON-CLAIM; soft-compose DA+DB+DC observe when present; soft-observe L28 CV–CY/CX billing-blocked honesty. Do **not** rewrite freeze tip pins.
2. Valid plan + custodyMode/ritualMode:
   - `ACTIVE` + well-formed + DA+DB+DC observe present + custody/ritual ok → PASS
   - `HOLD` → HOLD (observe; ≠ automatic L29 close / ≠ tip-pin rewrite / ≠ L28 reopen)
   - missing DA+DB+DC without ack / tip-pin rewrite / GHE / Fundacion / secrets / PRODUCTION_READY flip / L28 reopen / auto-close L29 / external APM / weaken ALWAYS_DENY / auto-seal → DENY (sealed)
3. Explicit honesty: ritual PASS ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠ GHE ≠ L29 auto-close ≠ L28 reopen ≠ external APM. Forced freeze soft-observe refuses tip-pin overrides.
4. Soft-observe freeze NON-CLAIM surfaces as labels/fixtures only (read-only; do not rewrite freeze tip pins).
5. Soft-compose DA+DB+DC+DC observe when present (compose; fixture OK for hermetic happy path); soft-observe L28 honesty labels.
6. Preserve FUNDACION_ALWAYS_DENY + human PRODUCTION_READY gate — refuse auto; never write Fundacion paths; never tip-rewrite.
7. Exclude satellite test from slim; opt-in via `npm run test:mission-dd`.
8. PRODUCTION_READY=NO; Fundacion Δ=0; NON-CLAIM tip-pin rewrite / PRODUCTION_READY flip / Fundacion write / GHE / L29 auto-close / L28 reopen / external APM.
9. Do **not** tip-refresh / rewrite freeze pins / touch Fundacion / claim CloudAgent from this mission. Freeze pin stays `4d8c6c59` (DC MEASURED #407) soft-observe only.

## Alternatives REJECTED

- Auto PRODUCTION_READY flip or tip-pin rewrite from ritual PASS — refuse.
- Rewrite freeze tip pins / claim GHE / auto-close L29 / reopen L28 — refuse.
- Reopen L17–L28 / new `docs/schemas/**/*.json` (AT_CEILING 35/35).
- Require live DA/DB govern for happy path — couples too hard; labels/fixture compose OK.
- External APM vendor integration — out of scope; ≠ external APM.
- Require only DA (omit DB) — refuse; Local CI Ritual Hardening hard-requires DA+DB+DC.

## Consequences

- Positive: Sealed Local CI Ritual Hardening Port with PASS|DENY|HOLD + chained DC receipts; soft-observe freeze NON-CLAIMS; compose DA+DB+DC + L28 honesty soft-observe; ~17 hermetic tests; Fundacion Δ=0.
- Negative: Local governed surface — not PRODUCTION_READY flip / not tip-pin rewrite / not L29 auto-close / not GHE / not L28 reopen / not external APM.
- Invariants: PRODUCTION_READY=NO; L17–L28 never reopen; port green ≠ L29 auto-close; freeze pin soft-observe 4d8c6c59 only.

## NON-CLAIMS

- Local CI Ritual Hardening Port ≠ PRODUCTION_READY flip / ≠ tip-pin rewrite / ≠ Fundacion write
- ≠ GHE / ≠ GHA green / ≠ L29 auto-close / ≠ L28 reopen / ≠ external APM / PRODUCTION_READY=NO / Fundacion Δ=0
