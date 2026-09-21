# ADR-0079 — Mission CY Mission OS / Control-Plane L0 Residual Honesty Port

- **Status:** Accepted — local governed (Ladder 28 Satellite 4)
- **Date:** 2026-09-21
- **Deciders:** EOS local governed use (Sovereign Operator Control-Plane Composition & HUD/Doctor Ritual Fabric)
- **Spec:** SPEC-0108

## Context

Freeze NON-CLAIMs and Mission OS / control-plane residual honesty (PRODUCTION_READY=NO, Fundacion Δ=0, ≠ GHE, L28 hold) need a governed Layer-0 honesty port with sealed receipts (`CY-RCPT-*`). CX (SPEC-0107 / #394) delivered Billing-Blocked Local Verify Ritual Port MEASURED at tip `487a38bf`; CW (SPEC-0106 / #392) and CV (SPEC-0105 / #390) MEASURED. Ladder 28 remains OPEN (Audit MEASURED · CV MEASURED · CW MEASURED · CX MEASURED · CY in progress · CZ pending). Freeze honesty pin for this package is **`487a38bf`** (CX MEASURED). Soft-observe freeze NON-CLAIM surfaces only — do not rewrite freeze tip pins; do not tip-refresh / start CZ from this package.

## Decision

1. Implement three Layer-0 modules under `src/core/composition/`:
   - `mission-os-control-plane-honesty-receipt.js`: Nine-field SHA-256 sealed `CY-RCPT-*` with forced freeze soft-observe `{ pin: 487a38bf…, readOnly: true, tipRewriteRefused, productionReadyFlipRefused, nonClaimLabels[] }`.
   - `mission-os-control-plane-honesty-policy-gate.js`: Fail-closed residual honesty plan validation (Fundacion Δ=0, Law VI, PRODUCTION_READY flip / tip-pin rewrite / L27 reopen / GHE / auto-close L28 / CZ start refuse; require CV+CW+CX observe labels).
   - `mission-os-control-plane-honesty-port.js`: `govern` / `evaluate` / `getDecision` / `verifyTrail`; soft-observe freeze NON-CLAIM labels/fixtures; soft-import CV/CW/CX honesty when present (compose, don't fork; builtin double otherwise). Do **not** rewrite freeze tip pins.
2. Valid plan + honestyMode:
   - `ACTIVE` + well-formed + CV+CW+CX observe present + honesty ok → PASS
   - `HOLD` → HOLD (observe; ≠ automatic L28 close / ≠ tip-pin rewrite / ≠ CZ)
   - missing CV/CW/CX without ack / tip-pin rewrite / GHE / Fundacion / secrets / PRODUCTION_READY flip / L27 reopen / auto-close L28 / CZ start / weaken ALWAYS_DENY / auto-seal → DENY (sealed)
3. Explicit honesty: residual PASS ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠ GHE ≠ L28 auto-close ≠ CZ start. Forced freeze soft-observe refuses tip-pin overrides.
4. Soft-observe freeze NON-CLAIM surfaces as labels/fixtures only (read-only; do not rewrite freeze main_tip / matrix evaluated_tip / dirty-defer tip pin / m4 EXPECTED_TIP).
5. Soft-import CV/CW/CX when present (compose; fixture OK for hermetic happy path).
6. Preserve FUNDACION_ALWAYS_DENY + human PRODUCTION_READY gate — refuse auto; never write Fundacion paths; never tip-rewrite.
7. Exclude satellite test from slim; opt-in via `npm run test:mission-cy`.
8. PRODUCTION_READY=NO; Fundacion Δ=0; NON-CLAIM tip-pin rewrite / PRODUCTION_READY flip / Fundacion write / GHE / L28 auto-close / CZ start / L27 reopen.
9. Do **not** tip-refresh / implement CZ in this mission. Freeze pin stays `487a38bf` (CX MEASURED) soft-observe only.

## Alternatives REJECTED

- Auto PRODUCTION_READY flip or tip-pin rewrite from residual honesty PASS — refuse (A6 + A7 + A12).
- Rewrite freeze tip pins / claim GHE / auto-close L28 / start CZ — refuse.
- Reopen L27 / new `docs/schemas/**/*.json` (AT_CEILING 35/35).
- Require live CV–CX govern for happy path — couples too hard; labels/fixture compose OK.
- Tip-refresh or start CZ from this package.

## Consequences

- Positive: Sealed Mission OS / Control-Plane L0 Residual Honesty Port with PASS|DENY|HOLD + chained CY receipts; soft-observe freeze NON-CLAIMS; compose CV+CW+CX; ~17 hermetic tests; Fundacion Δ=0.
- Negative: Local governed surface — not PRODUCTION_READY flip / not tip-pin rewrite / not L28 auto-close / not GHE / not CZ start.
- Invariants: PRODUCTION_READY=NO; L17–L27 never reopen; port green ≠ L28 auto-close; freeze pin soft-observe 487a38bf only.

## NON-CLAIMS

- Mission OS / Control-Plane L0 Residual Honesty Port ≠ PRODUCTION_READY flip / ≠ tip-pin rewrite / ≠ Fundacion write
- ≠ GHE / ≠ L28 auto-close / ≠ CZ start / ≠ L27 reopen / PRODUCTION_READY=NO / Fundacion Δ=0
