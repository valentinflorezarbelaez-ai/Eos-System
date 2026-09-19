# ADR-0056 — Mission CL Spec↔Code Traceability Graph Port

- **Status:** Accepted — local governed (Ladder 26 Satellite 1)
- **Date:** 2026-09-19
- **Deciders:** EOS local governed use (Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric)
- **Spec:** SPEC-0095

## Context

SPECs and code surfaces exist. EOS lacked a Layer-0 port that binds SPEC ids to code paths/modules with sealed receipts (`CL-RCPT-*`) and Fundacion deny — without claiming full LSP/IDE product, GitHub code search, or GH Enterprise enforcement.

Mission CL delivers a pure Layer-0 Spec↔Code Traceability Graph Port that:
1. Accepts link plans with planId and nodes[] `{ specId, codePath|moduleId, evidenceDigest? }`.
2. Validates plans fail-closed (missing planId, empty/oversize graphs, invalid surfaces, Law VI secrets, Fundacion, LSP/IDE / GitHub-code-search / GHE claim labels).
3. Hermetically binds SPEC↔code surfaces and seals `CL-RCPT-*` receipts.
4. Decides PASS | DENY. Verifies hash-chained custody via `verifyTrail()`. No network / no GH API.

## Decision

1. Implement three Layer-0 modules under `src/core/traceability/`:
   - `spec-code-traceability-receipt.js`: Canonical nine-field SHA-256 sealed receipts (`CL-RCPT-*`) via `node:crypto`.
   - `spec-code-traceability-policy-gate.js`: Fail-closed link-plan validation.
   - `spec-code-traceability-port.js`: Unified port facade (`link` / `trace`, `verifyTrail`, `getGraph`).
2. Valid plan → PASS; gate reject → DENY (sealed).
3. Exclude satellite test suite `tests/eos-cl-spec-code-traceability-port.test.js` from default slim discovery; opt-in via `npm run test:mission-cl` / `test:spec-code-traceability`.
4. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, ≠ full LSP/IDE / ≠ GitHub code search / ≠ GHE.
5. Do **not** tip-refresh / rewrite freeze pins / implement CM–CP in this mission.

## Alternatives considered AND REJECTED

### A. Shipping a full LSP/IDE product surface
**Rejected.** Hermetic Layer-0 Spec↔Code binding only; ≠ LSP/IDE product.

### B. Claiming GitHub code search or GH Enterprise enforcement
**Rejected.** NON-CLAIM; gate DENY on those claim labels. No GH API.

### C. Writing into Fundacion trees during links
**Rejected.** Fundacion Δ=0 ALWAYS_DENY invariant.

### D. Tip-refresh / freeze tip rewrite / starting CM inside this mission
**Rejected.** Separate missions. Freeze pin stays on L26 Audit #356 until SEPARATE tip-refresh.

### E. Claiming PRODUCTION_READY=YES
**Rejected.** PRODUCTION_READY=NO for this governed local surface.

## Consequences

- **Positive:** Sealed Spec↔Code binding with chained CL receipts; ~18 hermetic tests; zero secrets; Fundacion Δ=0; L26 axis opened without LSP/GHE/code-search claims.
- **Negative:** Binding is a local governed hermetic surface — not an IDE marketplace, language-server SaaS, or GitHub code search product.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI held; L17–L25 never reopen.

## NON-CLAIMS

- Spec↔Code Traceability Graph Port ≠ full LSP/IDE product
- ≠ GitHub code search
- ≠ claims GH Enterprise enforcement
- ≠ Fundacion writes (Δ=0)
- PRODUCTION_READY=NO (never flip in this mission)
- ≠ tip-refresh; ≠ Mission CM–CP
