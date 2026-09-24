# ADR-0097 — Mission DM Hexagonal Architecture Boundary Isolation Port

- **Status:** Accepted — local governed (Ladder 31 Satellite 3)
- **Date:** 2026-09-24
- **Deciders:** EOS local governed use (Sovereign Autonomous Verification & Epistemic Hardening Fabric)
- **Spec:** SPEC-0123
- **Prior ADR:** ADR-0096 (Mission DL Adversarial Invariant Refuter Port)

## Context

Ladder 30 is **CLOSED_FOR_LOCAL_GOVERNED_USE** (formal; NEVER reopen L30). Ladder 31 audit (ADR-0094) declared central axis **Sovereign Autonomous Verification & Epistemic Hardening Fabric** and ordered satellites DK → DL → DM → DN → DO. Mission DK (ADR-0095) and Mission DL (ADR-0096) are MEASURED & SEALED via commits `20cb9abd` and `f367a1cf`. Freeze soft-observe pin for this package is **`f367a1cf`** / full `f367a1cfb7945b9fc4a089aeebbc4ba68a9d9260` (Mission DL tip). Soft-observe freeze NON-CLAIM surfaces only — do not rewrite freeze tip pins.

Inspired by Clean Architecture and Gentleman Programming doctrine, domain entities and core business logic must remain 100% pure, containing zero external framework or infrastructure dependencies (`NODE_BUILTINS_ONLY` under `DEPENDENCY_POLICY_L0.md`). Outer infrastructure adapters must remain strictly behind abstract interfaces/ports. Operators and autonomous agents require an authoritative Layer-0 composition port that cryptographically seals boundary isolation audits into verifiable `DM-RCPT-*` receipts.

## Decision

1. Implement three Layer-0 modules under `src/core/composition/`:
   - `hexagonal-boundary-isolation-receipt.js`: Nine-field SHA-256 sealed `DM-RCPT-*` with forced freeze soft-observe `{ pin: f367a1cf…, readOnly: true, tipRewriteRefused, productionReadyFlipRefused, l30ReopenRefused, l31AutoCloseRefused, nonClaimLabels[] }` + `ceilingHold { schemasAtCeiling: true, slimHold: true }` + `boundaryHold { layer0Pure: true, zeroBoundaryViolations: true }` + `boundaryDigest`.
   - `hexagonal-boundary-isolation-policy-gate.js`: Fail-closed preconditions: requires valid `boundaryReport` (`violationsCount === 0`, `boundaryIntegrityStatus === 'ISOLATED'`, `nonBuiltinImportsCount === 0`), enforces Law VI, Fundacion write barrier (`FUNDACION_ALWAYS_DENY`), rejects hard-delete, mass-prune, `PRODUCTION_READY` flip, tip-pin rewrite, L30 reopen, L31 auto-close, and auto-seal without human gate.
   - `hexagonal-boundary-isolation-port.js`: `govern` / `verifyTrail`; synthesizes boundary audit metrics into a 64-character SHA-256 `boundaryDigest`; seals chained `DM-RCPT-*` receipts.
2. Valid plan + ritualMode:
   - `ACTIVE` + zero boundary violations + zero non-builtin imports + status `ISOLATED` → PASS + sealed `DM-RCPT-*`.
   - `HOLD` → HOLD (observe; zero state mutations).
   - Missing report / boundary violations / non-builtin imports / hard-delete / secrets / Fundacion / PR flip / tip rewrite / L30 reopen / auto-seal → DENY (sealed).
3. Explicit honesty: boundary isolation PASS ≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L30 reopen ≠ L31 closeout ≠ GHE green claim.
4. Soft-observe freeze pin `f367a1cf` (read-only; do not rewrite tip pin).
5. Preserve `FUNDACION_ALWAYS_DENY` + human `PRODUCTION_READY` gate.
6. Exclude satellite test from slim suite; opt-in via `npm run test:mission-dm`.
7. `PRODUCTION_READY=NO`; `Fundacion Δ=0`; schemas `AT_CEILING 35/35`.

## Alternatives REJECTED

- Auto-closing Ladder 31 from this port — REJECTED: Mission DO seam-pack closeout is strictly required to consolidate DK–DN.
- Allowing non-builtin npm dependencies in Layer 0 — REJECTED: `DEPENDENCY_POLICY_L0.md` enforces `NODE_BUILTINS_ONLY`.
- Flipping PRODUCTION_READY to YES — REJECTED: strict non-claim; human PO authority required.

## Consequences

- Positive: Clean/Hexagonal architecture boundary isolation is now an authoritative composition port producing cryptographically sealed audit receipts.
- Invariants: `PRODUCTION_READY=NO`; `Fundacion Δ=0`; schemas `AT_CEILING 35/35`; L31 remains open pending Missions DN–DO.

## NON-CLAIMS

- Hexagonal Boundary Isolation ≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L30 reopen ≠ L31 auto-close ≠ GHE ≠ GHA green ≠ Fundacion Δ>0.
