# ADR-0057 — Mission CM Evidence Binding & Claim Custody Port

- **Status:** Accepted — local governed (Ladder 26 Satellite 2)
- **Date:** 2026-09-19
- **Deciders:** EOS local governed use (Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric)
- **Spec:** SPEC-0096

## Context

Receipts & MEASURED claims exist. Mission CL delivered Spec↔Code edges with `CL-RCPT-*`. EOS lacked a Layer-0 port that binds claims to evidence digests (and optional prior CL `linkDigest`) with sealed custody receipts (`CM-RCPT-*`) — without claiming WORM SaaS, external audit product, SIEM retention, production data lake, or GH Enterprise enforcement.

Mission CM delivers a pure Layer-0 Evidence Binding & Claim Custody Port that:
1. Accepts bind plans with planId and claims[] `{ claimId, evidenceDigest, linkDigest?, specId?, codePath? }`.
2. Validates plans fail-closed (missing planId, empty/oversize claims, missing/invalid/tampered digests, Law VI secrets, Fundacion, WORM/SIEM/audit/GHE claim labels).
3. Hermetically binds claimId → evidenceDigest (+ optional CL linkDigest) and seals `CM-RCPT-*` receipts.
4. Decides PASS | DENY. Verifies hash-chained custody via `verifyTrail()`. No network / no GH API.

## Decision

1. Implement three Layer-0 modules under `src/core/evidence/`:
   - `evidence-binding-receipt.js`: Canonical nine-field SHA-256 sealed receipts (`CM-RCPT-*`) via `node:crypto`.
   - `evidence-binding-policy-gate.js`: Fail-closed bind-plan validation.
   - `evidence-binding-port.js`: Unified port facade (`bind` / `claim`, `verifyTrail`, `getBinding`).
2. Valid plan → PASS; gate reject → DENY (sealed).
3. Exclude satellite test suite `tests/eos-cm-evidence-binding-port.test.js` from default slim discovery; opt-in via `npm run test:mission-cm` / `test:evidence-binding`.
4. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, ≠ WORM SaaS / ≠ external audit / ≠ SIEM / ≠ data lake / ≠ GHE.
5. Do **not** tip-refresh / rewrite freeze pins / implement CN–CP in this mission.

## Alternatives considered AND REJECTED

### A. Shipping a WORM SaaS / SIEM / production data lake product
**Rejected.** Hermetic Layer-0 claim↔evidence custody only; ≠ WORM / SIEM / data lake.

### B. Claiming external audit product or GH Enterprise enforcement
**Rejected.** NON-CLAIM; gate DENY on those claim labels. No GH API.

### C. Writing into Fundacion trees during binds
**Rejected.** Fundacion Δ=0 ALWAYS_DENY invariant.

### D. Tip-refresh / freeze tip rewrite / starting CN–CP inside this mission
**Rejected.** Separate missions. Freeze pin stays on Mission CL #358 until SEPARATE tip-refresh.

### E. Claiming PRODUCTION_READY=YES
**Rejected.** PRODUCTION_READY=NO for this governed local surface.

## Consequences

- **Positive:** Sealed claim↔evidence custody with chained CM receipts; 18 hermetic tests; zero secrets; Fundacion Δ=0; L26 axis advanced without WORM/SIEM/audit/GHE claims.
- **Negative:** Binding is a local governed hermetic surface — not a WORM SaaS, external audit product, SIEM, or production data lake.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI held; L17–L25 never reopen.

## NON-CLAIMS

- Evidence Binding & Claim Custody Port ≠ WORM SaaS
- ≠ external audit product
- ≠ SIEM retention SaaS / ≠ production data lake
- ≠ claims GH Enterprise enforcement
- ≠ Fundacion writes (Δ=0)
- PRODUCTION_READY=NO (never flip in this mission)
- ≠ tip-refresh; ≠ Mission CN–CP
