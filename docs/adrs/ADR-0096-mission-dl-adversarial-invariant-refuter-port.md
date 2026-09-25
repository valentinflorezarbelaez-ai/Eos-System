# ADR-0096 — Mission DL Adversarial Invariant Refuter Port

- **Status:** Accepted — local governed (Ladder 31 Satellite 2)
- **Date:** 2026-09-24
- **Deciders:** EOS local governed use (Sovereign Autonomous Verification & Epistemic Hardening Fabric)
- **Spec:** SPEC-0122
- **Prior ADR:** ADR-0095 (Mission DK SpecBoot Mutation Testing Gatekeeper Port)

## Context

Ladder 30 is **CLOSED_FOR_LOCAL_GOVERNED_USE** (formal; NEVER reopen L30). Ladder 31 audit (ADR-0094) declared central axis **Sovereign Autonomous Verification & Epistemic Hardening Fabric** and ordered satellites DK → DL → DM → DN → DO. Mission DK is MEASURED & SEALED via commit `20cb9abd` (ADR-0095 / SPEC-0121). Freeze soft-observe pin for this package is **`20cb9abd`** / full `20cb9abd9025c995eb8e90d5a87296f57574263c` (Mission DK tip). Soft-observe freeze NON-CLAIM surfaces only — do not rewrite freeze tip pins.

While SpecBoot mutation testing verifies that test assertions are sensitive to code mutants, the autonomous engineering system also requires an adversarial red-team port to actively challenge proposed specifications, generating chaos vectors to expose unhandled edge cases and invariant violations before code is applied.

## Decision

1. Implement three Layer-0 modules under `src/core/composition/`:
   - `adversarial-invariant-refuter-receipt.js`: Nine-field SHA-256 sealed `DL-RCPT-*` with forced freeze soft-observe `{ pin: 20cb9abd…, readOnly: true, tipRewriteRefused, productionReadyFlipRefused, l30ReopenRefused, l31AutoCloseRefused, nonClaimLabels[] }` + `ceilingHold { schemasAtCeiling: true, slimHold: true }` + `refutationHold { invariantsWithstood: true, zeroBreachesUnhandled: true }` + `refutationDigest`.
   - `adversarial-invariant-refuter-policy-gate.js`: Fail-closed preconditions: requires valid `refutationReport` (`unhandledBreaches === 0`, `resilienceStatus !== 'COMPROMISED'`), supports CHALLENGE decision when warnings exist, enforces Law VI, Fundacion write barrier (`FUNDACION_ALWAYS_DENY`), rejects hard-delete, mass-prune, `PRODUCTION_READY` flip, tip-pin rewrite, L30 reopen, L31 auto-close, and auto-seal without human gate.
   - `adversarial-invariant-refuter-port.js`: `govern` / `verifyTrail`; synthesizes adversarial chaos outcomes into a 64-character SHA-256 `refutationDigest`; seals chained `DL-RCPT-*` receipts.
2. Valid plan + ritualMode:
   - `ACTIVE` + zero unhandled breaches + status resilient → PASS + sealed `DL-RCPT-*`.
   - `ACTIVE` + warnings present + allowChallengeMode → CHALLENGE + sealed `DL-RCPT-*`.
   - `HOLD` → HOLD (observe; zero state mutations).
   - Missing report / unhandled breaches / compromised status / hard-delete / secrets / Fundacion / PR flip / tip rewrite / L30 reopen / auto-seal → DENY (sealed).
3. Explicit honesty: adversarial refuter PASS ≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L30 reopen ≠ L31 closeout ≠ GHE green claim.
4. Soft-observe freeze pin `20cb9abd` (read-only; do not rewrite tip pin).
5. Preserve `FUNDACION_ALWAYS_DENY` + human `PRODUCTION_READY` gate.
6. Exclude satellite test from slim suite; opt-in via `npm run test:mission-dl`.
7. `PRODUCTION_READY=NO`; `Fundacion Δ=0`; schemas `AT_CEILING 35/35`.

## Alternatives REJECTED

- Auto-closing Ladder 31 from this port — REJECTED: Mission DO seam-pack closeout is strictly required to consolidate DK–DN.
- Permitting unhandled invariant breaches — REJECTED: fail-closed invariant protection.
- Flipping PRODUCTION_READY to YES — REJECTED: strict non-claim; human PO authority required.
- Commercial red-team consulting claims — REJECTED: hermetic Layer-0 local verification only.

## Consequences

- Positive: Specifications and tasks can now be subjected to automated adversarial refutation with cryptographic receipt sealing.
- Invariants: `PRODUCTION_READY=NO`; `Fundacion Δ=0`; schemas `AT_CEILING 35/35`; L31 remains open pending Missions DM–DO.

## NON-CLAIMS

- Adversarial Invariant Refuter ≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L30 reopen ≠ L31 auto-close ≠ GHE ≠ GHA green ≠ Fundacion Δ>0.
