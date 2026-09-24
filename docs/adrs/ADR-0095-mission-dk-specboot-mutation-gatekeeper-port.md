# ADR-0095 — Mission DK SpecBoot Mutation Testing Gatekeeper Port

- **Status:** Accepted — local governed (Ladder 31 Satellite 1)
- **Date:** 2026-09-24
- **Deciders:** EOS local governed use (Sovereign Autonomous Verification & Epistemic Hardening Fabric)
- **Spec:** SPEC-0121
- **Prior ADR:** ADR-0094 (Ladder 31 Maturity Gap Audit)

## Context

Ladder 30 is **CLOSED_FOR_LOCAL_GOVERNED_USE** (formal; NEVER reopen L30). Ladder 31 audit (ADR-0094) declared central axis **Sovereign Autonomous Verification & Epistemic Hardening Fabric** and ordered satellites DK → DL → DM → DN → DO. Freeze soft-observe pin for this package is **`2cead226`** / full `2cead2260332ed465153f550325d2918d5f65679` (Ladder 31 Audit tip). Soft-observe freeze NON-CLAIM surfaces only — do not rewrite freeze tip pins.

Following the creation of the pure Layer-0 mutation testing engine (`src/core/sdd/mutation-testing-harness.js` via ADR-0093 / SPEC-0120), operators and autonomous agents require an authoritative Layer-0 composition port that cryptographically seals mutation testing outcomes into verifiable `DK-RCPT-*` receipts, while strictly holding schemas `AT_CEILING 35/35` and denying unverified tasks or tasks with surviving mutants.

## Decision

1. Implement three Layer-0 modules under `src/core/composition/`:
   - `specboot-mutation-gatekeeper-receipt.js`: Nine-field SHA-256 sealed `DK-RCPT-*` with forced freeze soft-observe `{ pin: 2cead226…, readOnly: true, tipRewriteRefused, productionReadyFlipRefused, l30ReopenRefused, l31AutoCloseRefused, nonClaimLabels[] }` + `ceilingHold { schemasAtCeiling: true, slimHold: true }` + `mutationHold { zeroMutantsSurvived: true, resilienceVerified: true }` + `mutationDigest`.
   - `specboot-mutation-gatekeeper-policy-gate.js`: Fail-closed preconditions: requires valid `mutationReport` (`survivedMutants === 0`, `status === 'VERIFIED'`, `mutationScore >= threshold`), enforces Law VI, Fundacion write barrier (`FUNDACION_ALWAYS_DENY`), rejects hard-delete, mass-prune, `PRODUCTION_READY` flip, tip-pin rewrite, L30 reopen, L31 auto-close, and auto-seal without human gate.
   - `specboot-mutation-gatekeeper-port.js`: `govern` / `verifyTrail`; synthesizes mutation testing execution logs into a 64-character SHA-256 `mutationDigest`; seals chained `DK-RCPT-*` receipts.
2. Valid plan + ritualMode:
   - `ACTIVE` + zero mutants survived + status `VERIFIED` → PASS + sealed `DK-RCPT-*`.
   - `HOLD` → HOLD (observe; zero state mutations).
   - Missing report / surviving mutants / unverified status / hard-delete / secrets / Fundacion / PR flip / tip rewrite / L30 reopen / auto-seal → DENY (sealed).
3. Explicit honesty: mutation gatekeeper PASS ≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L30 reopen ≠ L31 closeout ≠ GHE green claim.
4. Soft-observe freeze pin `2cead226` (read-only; do not rewrite tip pin).
5. Preserve `FUNDACION_ALWAYS_DENY` + human `PRODUCTION_READY` gate.
6. Exclude satellite test from slim suite; opt-in via `npm run test:mission-dk`.
7. `PRODUCTION_READY=NO`; `Fundacion Δ=0`; schemas `AT_CEILING 35/35`.

## Alternatives REJECTED

- Auto-closing Ladder 31 from this port — REJECTED: Mission DO seam-pack closeout is strictly required to consolidate DK–DN.
- Permitting surviving mutants with warning — REJECTED: fail-closed zero surviving mutants invariant.
- Flipping PRODUCTION_READY to YES — REJECTED: strict non-claim; human PO authority required.
- Rewriting freeze tip pins — REJECTED: soft-observe only.

## Consequences

- Positive: Mathematical mutation resilience verification is now an authoritative composition port producing cryptographically sealed audit receipts.
- Invariants: `PRODUCTION_READY=NO`; `Fundacion Δ=0`; schemas `AT_CEILING 35/35`; L31 remains open pending Missions DL–DO.

## NON-CLAIMS

- SpecBoot Mutation Gatekeeper ≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L30 reopen ≠ L31 auto-close ≠ GHE ≠ GHA green ≠ Fundacion Δ>0.
