# ADR-0077 — Mission CW Cross-Port Continuity Orchestration Port

- **Status:** Accepted — local governed (Ladder 28 Satellite 2)
- **Date:** 2026-09-21
- **Deciders:** EOS local governed use (Sovereign Operator Control-Plane Composition & HUD/Doctor Ritual Fabric)
- **Spec:** SPEC-0106

## Context

CU seam-pack unifies CQ→CT in CI require/smoke, but EOS lacks an operator-facing Layer-0 orchestration **port** (`CW-RCPT-*`) composing CQ↔CR↔CS↔CT beyond the CI seam without rewriting CU or reopening L27. CV (SPEC-0105 / #390) delivered HUD/Doctor Honesty Ritual Composition Port MEASURED. Ladder 28 remains OPEN (Audit MEASURED · CV MEASURED · CW–CZ pending). Freeze honesty pin stays `d86d7525` (CV MEASURED); HEAD may lag `70a59c94` (tip-refresh #391) — do not tip-refresh from this package.

## Decision

1. Implement three Layer-0 modules under `src/core/composition/`:
   - `cross-port-continuity-orchestration-receipt.js`: Nine-field SHA-256 sealed `CW-RCPT-*`.
   - `cross-port-continuity-orchestration-policy-gate.js`: Fail-closed continuity orchestration plan validation (Fundacion Δ=0, Law VI, missing required CQ↔CR↔CS↔CT observe labels without ack, CU rewrite / GHE / PRODUCTION_READY flip / L27 reopen / tip rewrite claim refuse).
   - `cross-port-continuity-orchestration-port.js`: `govern` / `evaluate` / `getDecision` / `verifyTrail`; soft-imports CV honesty port / doctor-hud-honesty when present (compose, don't fork; builtin double otherwise). Do **not** rewrite CU seam-pack / operator-doctor.js / operator-hud.js.
2. Valid plan + orchestrationMode:
   - `ACTIVE` + well-formed + observed ports include required CQ↔CR↔CS↔CT continuity set + honesty ok → PASS
   - `HOLD` → HOLD (observe; ≠ automatic L28 close / ≠ CU rewrite)
   - missing required observe labels without ack / CU rewrite / Fundacion / secrets / PRODUCTION_READY flip / L27 reopen / tip rewrite / GHE / weaken ALWAYS_DENY / auto-seal → DENY (sealed)
3. Compose CQ–CT observe + CU seam observe as labels only (fixture compose OK; do not require live CQ–CT/CU govern for happy path; do not rewrite CU).
4. Soft-import CV honesty for composition surface when path present — fixture otherwise.
5. Preserve FUNDACION_ALWAYS_DENY + human PRODUCTION_READY gate — refuse auto; never write Fundacion paths; never tip-rewrite.
6. Exclude satellite test from slim; opt-in via `npm run test:mission-cw`.
7. PRODUCTION_READY=NO; Fundacion Δ=0; NON-CLAIM GHE / CU rewrite / L27 reopen / tip rewrite / L28 closeout / tip-refresh / CX.
8. Do **not** tip-refresh / implement CX in this mission. Freeze pin stays `d86d7525` until parent tip-refresh post-CW. Do NOT rewrite freeze to `70a59c94`.

## Alternatives REJECTED

- Auto PRODUCTION_READY flip or tip rewrite from continuity PASS — refuse (A7 + A8).
- Rewrite CU seam-pack / reopen L27 / new `docs/schemas/**/*.json` (AT_CEILING 35/35).
- Claim GHE enforcement from this port.
- Require live CQ–CT/CU govern for happy path — couples too hard; labels/fixture compose OK.
- Tip-refresh or start CX from this package.

## Consequences

- Positive: Sealed Cross-Port Continuity Orchestration Port with PASS|DENY|HOLD + chained CW receipts; compose CQ–CT + CU seam observe + CV honesty soft-import; ~17 hermetic tests; Fundacion Δ=0.
- Negative: Local governed surface — not PRODUCTION_READY flip / not tip rewrite / not L28 closeout / not GHE / not CU rewrite.
- Invariants: PRODUCTION_READY=NO; L17–L27 never reopen; port green ≠ L28 closeout; freeze pin stays CV MEASURED tip until parent tip-refresh.

## NON-CLAIMS

- Cross-Port Continuity Orchestration Port ≠ GHE enforcement / ≠ CU rewrite / ≠ L27 reopen / ≠ tip rewrite
- ≠ PRODUCTION_READY / ≠ L28 closeout / ≠ tip-refresh / ≠ CX start / PRODUCTION_READY=NO / Fundacion Δ=0
