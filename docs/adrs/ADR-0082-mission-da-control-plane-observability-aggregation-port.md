# ADR-0082 — Mission DA Control-Plane Observability Aggregation Port

- **Status:** Accepted — local governed (Ladder 29 Satellite 1)
- **Date:** 2026-09-21
- **Deciders:** EOS local governed use (Sovereign Observability & Evidence Economy Fabric)
- **Spec:** SPEC-0110
- **Prior ADR:** ADR-0081 (Ladder 29 Maturity Gap Audit)

## Context

Ladder 28 is **CLOSED_FOR_LOCAL_GOVERNED_USE** (CV–CZ MEASURED; never reopen). Ladder 29 audit (ADR-0081 / #401) declared axis **Sovereign Observability & Evidence Economy Fabric** and ordered satellites DA→DE. Freeze soft-observe pin for this package is **`2d6ab2d2`** (L29 audit #401). Soft-observe freeze NON-CLAIM surfaces only — do not rewrite freeze tip pins; tip-open is separate.

CV–CY sealed receipts exist as discrete ports, but operators lack a Layer-0 **control-plane observability aggregation** port that indexes / observes sealed receipts across CV–CY (+ optional CQ–CT) into a governed observability surface.

Schemas remain **AT_CEILING 35/35** — do not add `docs/schemas/**/*.json`.

## Decision

1. Implement three Layer-0 modules under `src/core/composition/`:
   - `control-plane-observability-aggregation-receipt.js`: Nine-field SHA-256 sealed `DA-RCPT-*` with forced freeze soft-observe `{ pin: 2d6ab2d2, readOnly: true, tipRewriteRefused, productionReadyFlipRefused, nonClaimLabels[] }`.
   - `control-plane-observability-aggregation-policy-gate.js`: Fail-closed plan validation (Fundacion Δ=0, Law VI, PRODUCTION_READY flip / tip-pin rewrite / L28 reopen / GHE / auto-close L29 / external APM refuse; require CV+CW+CX+CY observe labels).
   - `control-plane-observability-aggregation-port.js`: `govern` / `evaluate` / `getDecision` / `verifyTrail`; soft-observe freeze NON-CLAIM labels/fixtures; soft-import CV/CW/CX/CY honesty when present (compose, don't fork; builtin double otherwise). Do **not** rewrite freeze tip pins.
2. Valid plan + aggregationMode:
   - `ACTIVE` + well-formed + CV+CW+CX+CY observe present + aggregation ok → PASS
   - `HOLD` → HOLD (observe; ≠ automatic L29 close / ≠ tip-pin rewrite / ≠ L28 reopen)
   - missing CV/CW/CX/CY without ack / tip-pin rewrite / GHE / Fundacion / secrets / PRODUCTION_READY flip / L28 reopen / auto-close L29 / external APM / weaken ALWAYS_DENY / auto-seal → DENY (sealed)
3. Explicit honesty: aggregation PASS ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠ GHE ≠ L29 auto-close ≠ L28 reopen ≠ external APM. Forced freeze soft-observe refuses tip-pin overrides.
4. Soft-observe freeze NON-CLAIM surfaces as labels/fixtures only (read-only; do not rewrite freeze main_tip / matrix evaluated_tip / dirty-defer tip pin / m4 EXPECTED_TIP).
5. Soft-import CV/CW/CX/CY when present (compose; fixture OK for hermetic happy path).
6. Preserve FUNDACION_ALWAYS_DENY + human PRODUCTION_READY gate — refuse auto; never write Fundacion paths; never tip-rewrite.
7. Exclude satellite test from slim; opt-in via `npm run test:mission-da`.
8. PRODUCTION_READY=NO; Fundacion Δ=0; NON-CLAIM tip-pin rewrite / PRODUCTION_READY flip / Fundacion write / GHE / L29 auto-close / L28 reopen / external APM.
9. Do **not** tip-refresh / rewrite freeze pins / touch Fundacion / claim CloudAgent from this mission. Freeze pin stays `2d6ab2d2` (L29 audit #401) soft-observe only.

## Alternatives REJECTED

- Auto PRODUCTION_READY flip or tip-pin rewrite from aggregation PASS — refuse.
- Rewrite freeze tip pins / claim GHE / auto-close L29 / reopen L28 — refuse.
- Reopen L17–L28 / new `docs/schemas/**/*.json` (AT_CEILING 35/35).
- Require live CV–CY govern for happy path — couples too hard; labels/fixture compose OK.
- External APM vendor integration — out of scope; ≠ external APM.

## Consequences

- Positive: Sealed Control-Plane Observability Aggregation Port with PASS|DENY|HOLD + chained DA receipts; soft-observe freeze NON-CLAIMS; compose CV+CW+CX+CY; ~17 hermetic tests; Fundacion Δ=0.
- Negative: Local governed surface — not PRODUCTION_READY flip / not tip-pin rewrite / not L29 auto-close / not GHE / not L28 reopen / not external APM.
- Invariants: PRODUCTION_READY=NO; L17–L28 never reopen; port green ≠ L29 auto-close; freeze pin soft-observe 2d6ab2d2 only.

## NON-CLAIMS

- Control-Plane Observability Aggregation Port ≠ PRODUCTION_READY flip / ≠ tip-pin rewrite / ≠ Fundacion write
- ≠ GHE / ≠ L29 auto-close / ≠ L28 reopen / ≠ external APM / PRODUCTION_READY=NO / Fundacion Δ=0
