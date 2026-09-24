# ADR-0098 — Mission DN Sovereign Epistemic Knowledge Ledger Port

- **Status:** Accepted — local governed (Ladder 31 Satellite 4)
- **Date:** 2026-09-24
- **Deciders:** EOS local governed use (Sovereign Autonomous Verification & Epistemic Hardening Fabric)
- **Spec:** SPEC-0124
- **Prior ADR:** ADR-0097 (Mission DM Hexagonal Architecture Boundary Isolation Port)

## Context

Ladder 30 is **CLOSED_FOR_LOCAL_GOVERNED_USE** (formal; NEVER reopen L30). Ladder 31 audit (ADR-0094) declared central axis **Sovereign Autonomous Verification & Epistemic Hardening Fabric** and ordered satellites DK → DL → DM → DN → DO. Missions DK (ADR-0095), DL (ADR-0096), and DM (ADR-0097) are MEASURED & SEALED via commits `20cb9abd`, `f367a1cf`, and `079e6f2a`. Freeze soft-observe pin for this package is **`079e6f2a`** / full `079e6f2a9564e70a42738faeab138cc4aa5974fd` (Mission DM tip). Soft-observe freeze NON-CLAIM surfaces only — do not rewrite freeze tip pins.

In autonomous software engineering, truth claims must be grounded in objective, cryptographic execution evidence rather than LLM assertions or unverified summaries. The Epistemic Taxonomy dictates that state transitions (specifically transitioning to `VERIFIED`) can only occur from proven audit execution (`AUDIT_EXECUTED` or `REVALIDATION_REQUIRED`) with non-zero passing checks and a verifiable SHA-256 evidence hash. Operators and autonomous agents require an authoritative Layer-0 composition port that cryptographically seals epistemic state transitions into verifiable `DN-RCPT-*` receipts.

## Decision

1. Implement three Layer-0 modules under `src/core/composition/`:
   - `sovereign-epistemic-ledger-receipt.js`: Nine-field SHA-256 sealed `DN-RCPT-*` with forced freeze soft-observe `{ pin: 079e6f2a…, readOnly: true, tipRewriteRefused, productionReadyFlipRefused, l30ReopenRefused, l31AutoCloseRefused, nonClaimLabels[] }` + `ceilingHold { schemasAtCeiling: true, slimHold: true }` + `epistemicHold { epistemicStateGrounded: true, ungroundedClaimsRefused: true }` + `epistemicDigest`.
   - `sovereign-epistemic-ledger-policy-gate.js`: Fail-closed preconditions: requires valid `epistemicReport` with legitimate state transition (`AUDIT_EXECUTED` or `REVALIDATION_REQUIRED` ➔ `VERIFIED`), requires `checksPassed > 0`, requires valid 64-char `evidenceHash`, enforces Law VI, Fundacion write barrier (`FUNDACION_ALWAYS_DENY`), rejects hard-delete, mass-prune, `PRODUCTION_READY` flip, tip-pin rewrite, L30 reopen, L31 auto-close, and auto-seal without human gate.
   - `sovereign-epistemic-ledger-port.js`: `govern` / `verifyTrail`; synthesizes epistemic transition metadata into a 64-character SHA-256 `epistemicDigest`; seals chained `DN-RCPT-*` receipts.
2. Valid plan + ritualMode:
   - `ACTIVE` + valid epistemic transition + non-zero checks + valid hash → PASS + sealed `DN-RCPT-*`.
   - `HOLD` → HOLD (observe; zero state mutations).
   - Missing report / invalid transition / zero checks / missing hash / hard-delete / secrets / Fundacion / PR flip / tip rewrite / L30 reopen / auto-seal → DENY (sealed).
3. Explicit honesty: epistemic ledger PASS ≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L30 reopen ≠ L31 closeout ≠ GHE green claim.
4. Soft-observe freeze pin `079e6f2a` (read-only; do not rewrite tip pin).
5. Preserve `FUNDACION_ALWAYS_DENY` + human `PRODUCTION_READY` gate.
6. Exclude satellite test from slim suite; opt-in via `npm run test:mission-dn`.
7. `PRODUCTION_READY=NO`; `Fundacion Δ=0`; schemas `AT_CEILING 35/35`.

## Alternatives REJECTED

- Auto-closing Ladder 31 from this port — REJECTED: Mission DO seam-pack closeout is strictly required to consolidate DK–DN.
- Allowing ungrounded claims of VERIFIED — REJECTED: strict Epistemic Taxonomy invariant.
- Flipping PRODUCTION_READY to YES — REJECTED: strict non-claim; human PO authority required.

## Consequences

- Positive: Epistemic claims and persistent memory synchronizations are now governed by a cryptographic Layer-0 ledger preventing hallucinations or ungrounded status declarations.
- Invariants: `PRODUCTION_READY=NO`; `Fundacion Δ=0`; schemas `AT_CEILING 35/35`; L31 remains open pending Mission DO.

## NON-CLAIMS

- Sovereign Epistemic Ledger ≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L30 reopen ≠ L31 auto-close ≠ GHE ≠ GHA green ≠ Fundacion Δ>0.
