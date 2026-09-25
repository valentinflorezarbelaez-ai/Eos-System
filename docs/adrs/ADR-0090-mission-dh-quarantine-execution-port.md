# ADR-0090 — Mission DH Quarantine / Soft-Remove Execution Port

- **Status:** Accepted — local governed (Ladder 30 Satellite 3)
- **Date:** 2026-09-24
- **Deciders:** EOS local governed use (Sovereign Complexity Ceiling Governance & Maturity Hardening Fabric)
- **Spec:** SPEC-0117
- **Prior ADR:** ADR-0089 (Mission DG PO Level-2 Named-Path Disposition Gate Port)

## Context

Ladder 29 is **CLOSED_FOR_LOCAL_GOVERNED_USE** (formal; NEVER reopen L29). Ladder 30 audit (ADR-0087 / #413) + tip-open #414 + Mission DF MEASURED (ADR-0088 / SPEC-0115) + Mission DG PO L2 GATED (ADR-0089 / SPEC-0116) left L30 OPEN (Audit + DF MEASURED + DG GATED · DH–DJ pending). Freeze soft-observe pin for this package is **`06af7278`** / full `06af7278d6bdf3b55c65a044bfb22ce93e6205cf` (Real Provider Execution tip). Soft-observe freeze NON-CLAIM surfaces only — do not rewrite freeze tip pins.

Operators require a Layer-0 port that safely executes non-destructive quarantine isolation (soft-remove) strictly for PO Level-2 approved named paths (linked via `DG-RCPT-*`). Destructive hard deletes (`rm -rf`, `purge`, `forceDelete`) and mass prunes are strictly prohibited.

Schemas remain **AT_CEILING 35/35** — do not add `docs/schemas/**/*.json`.

## Decision

1. Implement three Layer-0 modules under `src/core/composition/`:
   - `quarantine-execution-receipt.js`: Nine-field SHA-256 sealed `DH-RCPT-*` with forced freeze soft-observe `{ pin: 06af7278…, readOnly: true, tipRewriteRefused, productionReadyFlipRefused, hardDeleteRefused, massPruneRefused, nonClaimLabels[] }` + `ceilingHold { schemasAtCeiling: true, slimHold: true }` + `quarantinedPaths[]` + `manifestDigest` + `dgReceiptLink`.
   - `quarantine-execution-policy-gate.js`: Fail-closed plan validation (Fundacion Δ=0, Law VI, hard-delete refuse, mass-prune refuse, unapproved-path refuse against DG namedPaths, missing DG receipt refuse, PRODUCTION_READY flip refuse, tip-pin rewrite refuse, L29 reopen refuse, auto-seal refuse).
   - `quarantine-execution-port.js`: `govern` / `verifyTrail`; validates plan against policy gate; moves approved files into `.quarantine/<date>/`; computes file SHA-256 digests and manifest digest; seals chained `DH-RCPT-*` receipts.
2. Valid plan + executionMode:
   - `ACTIVE` + valid DG receipt + quarantinedPaths strictly in DG namedPaths allowlist → PASS + non-destructive file move + sealed receipt.
   - `HOLD` → HOLD (observe; zero file mutations).
   - Hard-delete flags (`forceDelete`, `purge`) / unapproved paths / missing DG receipt / secrets / Fundacion / PRODUCTION_READY flip / L29 reopen / auto-seal → DENY (sealed).
3. Explicit honesty: quarantine PASS ≠ destructive delete ≠ mass prune ≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L29 reopen ≠ Fundacion Δ>0.
4. Soft-observe freeze pin `06af7278` (read-only; do not rewrite tip pin).
5. Preserve `FUNDACION_ALWAYS_DENY` + human `PRODUCTION_READY` gate.
6. Exclude satellite test from slim suite; opt-in via `npm run test:mission-dh`.
7. `PRODUCTION_READY=NO`; `Fundacion Δ=0`; schemas `AT_CEILING 35/35`.

## Alternatives REJECTED

- Destructive file deletion (`rm -rf` / `unlink` / purge) — REJECTED: zero data destruction invariant; soft quarantine relocation only.
- Unsupervised or automatic file deletion without DG receipt linkage — REJECTED: requires explicit PO Level-2 named-path disposition approval.
- Mass prune via wildcards — REJECTED: only explicitly named paths in allowlist may be quarantined.
- Auto-seal without human gate held — REJECTED: human gate is strictly held.
- PRODUCTION_READY flip or tip-pin rewrite from quarantine PASS — REJECTED.

## Consequences

- Positive: Safe, non-destructive file isolation mechanism with cryptographic receipt chaining (`DH-RCPT-*`) and file manifest verification.
- Negative: Quarantined files occupy storage in `.quarantine/` until future operator archive ritual.
- Invariants: `PRODUCTION_READY=NO`; `Fundacion Δ=0`; schemas `AT_CEILING 35/35`; zero hard deletes.

## NON-CLAIMS

- Quarantine Execution ≠ destructive delete ≠ mass prune ≠ Fundacion Δ>0 ≠ PRODUCTION_READY flip
- ≠ tip-pin rewrite ≠ L29 reopen ≠ L30 auto-close ≠ GHE ≠ CloudAgent
