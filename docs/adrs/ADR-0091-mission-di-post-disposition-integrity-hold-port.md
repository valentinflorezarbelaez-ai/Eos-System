# ADR-0091 — Mission DI Post-Disposition Integrity & Docs SSOT Hold Ritual Port

- **Status:** Accepted — local governed (Ladder 30 Satellite 4)
- **Date:** 2026-09-24
- **Deciders:** EOS local governed use (Sovereign Complexity Ceiling Governance & Maturity Hardening Fabric)
- **Spec:** SPEC-0118
- **Prior ADR:** ADR-0090 (Mission DH Quarantine / Soft-Remove Execution Port)

## Context

Ladder 29 is **CLOSED_FOR_LOCAL_GOVERNED_USE** (formal; NEVER reopen L29). Ladder 30 audit (ADR-0087 / #413) + tip-open #414 + Mission DF MEASURED (ADR-0088 / SPEC-0115) + Mission DG PO L2 GATED (ADR-0089 / SPEC-0116) + Mission DH QUARANTINED (ADR-0090 / SPEC-0117) left L30 OPEN (Audit + DF + DG + DH MEASURED · DI–DJ pending). Freeze soft-observe pin for this package is **`3d0c2e0b`** / full `3d0c2e0b313e340c8db3c3958f0eb46ab7590f26` (Mission DH tip). Soft-observe freeze NON-CLAIM surfaces only — do not rewrite freeze tip pins.

Operators require a Layer-0 port that verifies deterministic system integrity (`verify:strict` hold) and validates documentation SSOT consistency following file quarantine isolation, while holding schemas `AT_CEILING 35/35` and strictly refusing privilege escalations or premature ladder closeouts.

## Decision

1. Implement three Layer-0 modules under `src/core/composition/`:
   - `post-disposition-integrity-hold-receipt.js`: Nine-field SHA-256 sealed `DI-RCPT-*` with forced freeze soft-observe `{ pin: 3d0c2e0b…, readOnly: true, tipRewriteRefused, productionReadyFlipRefused, l29ReopenRefused, l30AutoCloseRefused, nonClaimLabels[] }` + `ceilingHold { schemasAtCeiling: true, slimHold: true }` + `docsSsotHold { docsConsistent: true, inventoryReflected: true }` + `dhReceiptLink` + `integrityDigest`.
   - `post-disposition-integrity-hold-policy-gate.js`: Fail-closed preconditions: requires valid `DH-RCPT-*` linkage (`decision='PASS'`), requires integrity test checks status `VERIFIED` and zero failures, enforces Law VI, Fundacion write barrier (`FUNDACION_ALWAYS_DENY`), rejects hard-delete, mass-prune, `PRODUCTION_READY` flip, tip-pin rewrite, L29 reopen, L30 auto-close, and auto-seal without human gate.
   - `post-disposition-integrity-hold-port.js`: `govern` / `verifyTrail`; synthesizes test audit outputs and docs SSOT state into a 64-character SHA-256 `integrityDigest`; seals chained `DI-RCPT-*` receipts.
2. Valid plan + ritualMode:
   - `ACTIVE` + valid DH receipt + integrity checks passed → PASS + sealed `DI-RCPT-*`.
   - `HOLD` → HOLD (observe; zero state mutations).
   - Missing DH receipt / integrity failures / hard-delete / secrets / Fundacion / PR flip / tip rewrite / L29 reopen / auto-seal → DENY (sealed).
3. Explicit honesty: integrity hold PASS ≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L29 reopen ≠ L30 closeout ≠ GHE green claim.
4. Soft-observe freeze pin `3d0c2e0b` (read-only; do not rewrite tip pin).
5. Preserve `FUNDACION_ALWAYS_DENY` + human `PRODUCTION_READY` gate.
6. Exclude satellite test from slim suite; opt-in via `npm run test:mission-di`.
7. `PRODUCTION_READY=NO`; `Fundacion Δ=0`; schemas `AT_CEILING 35/35`.

## Alternatives REJECTED

- Auto-closing Ladder 30 from this port — REJECTED: Mission DJ seam-pack closeout is strictly required to consolidate DF–DI.
- Flipping PRODUCTION_READY to YES — REJECTED: strict non-claim; human PO authority required.
- Rewriting freeze tip pins — REJECTED: soft-observe only.
- Suppressing or skipping failed integrity audit checks — REJECTED: fail-closed invariant.

## Consequences

- Positive: Authoritative verification that the codebase, tests, and documentation SSOT remain intact and fully consistent after file quarantine.
- Invariants: `PRODUCTION_READY=NO`; `Fundacion Δ=0`; schemas `AT_CEILING 35/35`; L30 remains open pending Mission DJ.

## NON-CLAIMS

- Post-Disposition Integrity Hold ≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L29 reopen ≠ L30 auto-close ≠ GHE ≠ GHA green ≠ Fundacion Δ>0.
