# ADR-0088 — Mission DF Complexity Inventory Re-measure & Ceiling Hold Port

- **Status:** Accepted — local governed (Ladder 30 Satellite 1)
- **Date:** 2026-09-21
- **Deciders:** EOS local governed use (Sovereign Complexity Ceiling Governance & Maturity Hardening Fabric)
- **Spec:** SPEC-0115
- **Prior ADR:** ADR-0087 (Ladder 30 Maturity Gap Audit)

## Context

Ladder 29 is **CLOSED_FOR_LOCAL_GOVERNED_USE** (formal; NEVER reopen L29). Ladder 30 audit (ADR-0087 / #413) declared axis **Sovereign Complexity Ceiling Governance & Maturity Hardening Fabric** and ordered satellites DF→DJ. Tip-open #414 left L30 OPEN (Audit MEASURED · DF–DJ pending). Freeze soft-observe pin for this package is **`36c99107`** / full `36c99107dfc6696aa8e54533a6a67622f1437fc8` (L30 audit #413 tip). Soft-observe freeze NON-CLAIM surfaces only — do not rewrite freeze tip pins.

Operators need a Layer-0 port that re-measures complexity inventory / ceiling-hold surfaces (Post-L26 inventory, ADR-0075 prune plan, T6 ceiling hold) without authorizing deletes, mass prune, PRODUCTION_READY flip, tip-pin rewrite, or L30 auto-close.

Schemas remain **AT_CEILING 35/35** — do not add `docs/schemas/**/*.json`.

## Decision

1. Implement three Layer-0 modules under `src/core/composition/`:
   - `complexity-inventory-remeasure-receipt.js`: Nine-field SHA-256 sealed `DF-RCPT-*` with forced freeze soft-observe `{ pin: 36c99107…, readOnly: true, tipRewriteRefused, productionReadyFlipRefused, deleteAuthRefused, nonClaimLabels[] }` + `ceilingHold { schemasAtCeiling: true, slimHold: true }`.
   - `complexity-inventory-remeasure-policy-gate.js`: Fail-closed plan validation (Fundacion Δ=0, Law VI, PRODUCTION_READY flip / tip-pin rewrite / L29 reopen / GHE / auto-close L30 / delete-auth / mass-prune refuse; require POST_L26+ADR_0075+T6 observe surfaces).
   - `complexity-inventory-remeasure-port.js`: `govern` / `evaluate` / `getDecision` / `verifyTrail`; soft-observe freeze NON-CLAIM; soft-import ceiling surfaces when present (compose, don't fork; builtin double otherwise). Do **not** rewrite freeze tip pins. PASS = re-measure+hold sealed, NOT delete auth.
2. Valid plan + remeasureMode:
   - `ACTIVE` + well-formed + POST_L26+ADR_0075+T6 observe present + inventory/ceiling ok → PASS
   - `HOLD` → HOLD (observe; ≠ automatic L30 close / ≠ tip-pin rewrite / ≠ L29 reopen / ≠ delete auth)
   - delete-auth / mass-prune / tip-pin rewrite / GHE / Fundacion / secrets / PRODUCTION_READY flip / L29 reopen / auto-close L30 / weaken ALWAYS_DENY / auto-seal / tampered digest → DENY (sealed)
3. Explicit honesty: remeasure PASS ≠ delete authorization ≠ mass prune ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠ GHE ≠ L30 auto-close ≠ L29 reopen. Inventory/plan ≠ delete auth (ADR-0075 / Post-L26 A).
4. Soft-observe freeze NON-CLAIM surfaces as labels/fixtures only (read-only; do not rewrite freeze main_tip / matrix evaluated_tip / dirty-defer tip pin / m4 EXPECTED_TIP).
5. Soft-import ceiling surfaces (Post-L26 / ADR-0075 / T6 / optional DA) when present (compose; fixture OK for hermetic happy path).
6. Preserve FUNDACION_ALWAYS_DENY + human PRODUCTION_READY gate — refuse auto; never write Fundacion paths; never tip-rewrite; never authorize delete.
7. Exclude satellite test from slim; opt-in via `npm run test:mission-df`.
8. PRODUCTION_READY=NO; Fundacion Δ=0; schemas AT_CEILING 35/35.
9. Do **not** tip-refresh / rewrite freeze pins / touch Fundacion / claim CloudAgent from this mission. Freeze pin stays `36c99107` soft-observe only. Formal L29 CLOSED retained.

## Alternatives REJECTED

- Treat inventory/plan as delete authorization — refuse (ADR-0075 / Post-L26 A).
- Auto PRODUCTION_READY flip or tip-pin rewrite from remeasure PASS — refuse.
- Rewrite freeze tip pins / claim GHE / auto-close L30 / reopen L29 — refuse.
- Mass prune / unsupervised delete from this port — refuse.
- Reopen L29 / new `docs/schemas/**/*.json` (AT_CEILING 35/35).
- Require live Post-L26 docs for happy path — couples too hard; labels/fixture compose OK.

## Consequences

- Positive: Sealed Complexity Inventory Remeasure Port with PASS|DENY|HOLD + chained DF receipts; soft-observe freeze NON-CLAIMS; ceiling hold AT_CEILING; ~17 hermetic tests; Fundacion Δ=0.
- Negative: Local governed surface — not delete auth / not mass prune / not PRODUCTION_READY flip / not tip-pin rewrite / not L30 auto-close / not GHE / not L29 reopen.
- Invariants: PRODUCTION_READY=NO; L29 never reopen; port green ≠ L30 auto-close; freeze pin soft-observe 36c99107 only; inventory≠delete-auth.

## NON-CLAIMS

- Complexity Inventory Re-measure Port ≠ delete authorization ≠ mass prune ≠ PRODUCTION_READY flip
- ≠ tip-pin rewrite ≠ Fundacion write ≠ GHE ≠ L30 auto-close ≠ L29 reopen ≠ unsupervised delete
- Inventory/plan ≠ delete auth (ADR-0075 / Post-L26 A) / PRODUCTION_READY=NO / Fundacion Δ=0 / schemas AT_CEILING 35/35
