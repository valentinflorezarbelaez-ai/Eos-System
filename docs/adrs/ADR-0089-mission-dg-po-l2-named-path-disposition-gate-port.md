# ADR-0089 — Mission DG PO Level-2 Named-Path Disposition Gate Port

- **Status:** Accepted — local governed (Ladder 30 Satellite 2)
- **Date:** 2026-09-21
- **Deciders:** EOS local governed use (Sovereign Complexity Ceiling Governance & Maturity Hardening Fabric)
- **Spec:** SPEC-0116
- **Prior ADR:** ADR-0088 (Mission DF Complexity Inventory Remeasure Port)

## Context

Ladder 29 is **CLOSED_FOR_LOCAL_GOVERNED_USE** (formal; NEVER reopen L29). Ladder 30 audit (ADR-0087 / #413) + tip-open #414 + Mission DF MEASURED (#415 / ADR-0088 / SPEC-0115) left L30 OPEN (Audit + DF MEASURED · DG–DJ pending) via tip-refresh #416. Freeze soft-observe pin for this package is **`31f811ca`** / full `31f811caf7ff28cc25aa9ac87add0e45f4abf650` (Mission DF #415 tip). Soft-observe freeze NON-CLAIM surfaces only — do not rewrite freeze tip pins.

Operators need a Layer-0 port that gates PO Level-2 named-path disposition decisions (ACTIVE allowlist of named paths under human gate) without executing deletes, auto-approving deletes, flipping PRODUCTION_READY, rewriting tip pins, reopening L29, or auto-closing L30. Delete execution is Mission DH later. Gate ≠ execution.

Schemas remain **AT_CEILING 35/35** — do not add `docs/schemas/**/*.json`.

## Decision

1. Implement three Layer-0 modules under `src/core/composition/`:
   - `po-l2-named-path-disposition-receipt.js`: Nine-field SHA-256 sealed `DG-RCPT-*` with forced freeze soft-observe `{ pin: 31f811ca…, readOnly: true, tipRewriteRefused, productionReadyFlipRefused, deleteAuthRefused, autoApproveRefused, nonClaimLabels[] }` + `ceilingHold { schemasAtCeiling: true, slimHold: true }` + `namedPaths[]` + `humanGateHeld`.
   - `po-l2-named-path-disposition-policy-gate.js`: Fail-closed plan validation (Fundacion Δ=0, Law VI, PRODUCTION_READY flip / tip-pin rewrite / L29 reopen / GHE / auto-close L30 / delete-auth / mass-prune / auto-approve / empty namedPaths for ACTIVE refuse; require DF_REMEASURE+ADR_0075_HITL+AP_HITL observe surfaces).
   - `po-l2-named-path-disposition-port.js`: `govern` / `evaluate` / `getDecision` / `verifyTrail`; soft-observe freeze NON-CLAIM; soft-import DF remeasure + ADR-0075/AP HITL observe when present (compose, don't fork; builtin double otherwise); soft-observe DF inventoryDigest when present. Do **not** rewrite freeze tip pins. PASS = disposition gated with named paths sealed, NOT delete execution.
2. Valid plan + dispositionMode:
   - `ACTIVE` + well-formed + namedPaths non-empty + DF_REMEASURE+ADR_0075_HITL+AP_HITL observe present + disposition/ceiling ok → PASS
   - `HOLD` → HOLD (observe; ≠ automatic L30 close / ≠ tip-pin rewrite / ≠ L29 reopen / ≠ delete execution / ≠ auto-approve)
   - empty namedPaths (ACTIVE) / auto-approve / delete-auth / mass-prune / tip-pin rewrite / GHE / Fundacion / secrets / PRODUCTION_READY flip / L29 reopen / auto-close L30 / weaken ALWAYS_DENY / auto-seal / tampered digest → DENY (sealed)
3. Explicit honesty: disposition PASS ≠ delete execution ≠ auto-approve deletes ≠ unsupervised delete ≠ mass prune ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠ GHE ≠ L30 auto-close ≠ L29 reopen ≠ CloudAgent. Inventory/plan ≠ delete auth. Gate ≠ execution (DH later).
4. Soft-observe freeze NON-CLAIM surfaces as labels/fixtures only (read-only; do not rewrite freeze tip pins).
5. Soft-import DF remeasure observe + ADR-0075/AP HITL observe fixtures when present (compose; fixture OK for hermetic happy path). Soft-observe DF inventoryDigest when present.
6. Preserve FUNDACION_ALWAYS_DENY + human PRODUCTION_READY gate — refuse auto; never write Fundacion paths; never tip-rewrite; never authorize or execute delete.
7. Exclude satellite test from slim; opt-in via `npm run test:mission-dg`.
8. PRODUCTION_READY=NO; Fundacion Δ=0; schemas AT_CEILING 35/35.
9. Do **not** tip-refresh / rewrite freeze pins / touch Fundacion / claim CloudAgent from this mission. Freeze pin stays `31f811ca` soft-observe only. Formal L29 CLOSED retained.

## Alternatives REJECTED

- Treat disposition PASS as delete authorization/execution — refuse (gate ≠ execution; DH later).
- Auto-approve deletes without namedPaths / without human gate — refuse.
- Auto PRODUCTION_READY flip or tip-pin rewrite from disposition PASS — refuse.
- Rewrite freeze tip pins / claim GHE / auto-close L30 / reopen L29 — refuse.
- Mass prune / unsupervised delete from this port — refuse.
- Reopen L29 / new `docs/schemas/**/*.json` (AT_CEILING 35/35).
- Require live DF/HITL docs for happy path — couples too hard; labels/fixture compose OK.

## Consequences

- Positive: Sealed PO L2 Named-Path Disposition Gate Port with PASS|DENY|HOLD + chained DG receipts; soft-observe freeze NON-CLAIMS; namedPaths allowlist; ~17 hermetic tests; Fundacion Δ=0.
- Negative: Local governed surface — not delete execution / not auto-approve / not mass prune / not PRODUCTION_READY flip / not tip-pin rewrite / not L30 auto-close / not GHE / not L29 reopen / not CloudAgent.
- Invariants: PRODUCTION_READY=NO; L29 never reopen; port green ≠ L30 auto-close; freeze pin soft-observe 31f811ca only; gate≠execution; namedPaths required for ACTIVE.

## NON-CLAIMS

- PO L2 Named-Path Disposition Gate ≠ unsupervised delete ≠ mass prune ≠ auto-approve deletes ≠ PRODUCTION_READY flip
- ≠ tip-pin rewrite ≠ Fundacion write ≠ GHE ≠ L30 auto-close ≠ L29 reopen ≠ CloudAgent ≠ delete execution
- Inventory/plan ≠ delete auth / gate ≠ execution (DH later) / PRODUCTION_READY=NO / Fundacion Δ=0 / schemas AT_CEILING 35/35
