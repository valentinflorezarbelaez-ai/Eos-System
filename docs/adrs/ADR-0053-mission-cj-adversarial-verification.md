# ADR-0053 — Mission CJ Continuous Adversarial Verification Port

- **Status:** Accepted — local governed (Ladder 25 Satellite 4)
- **Date:** 2026-09-18
- **Deciders:** EOS local governed use (Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric)
- **Spec:** SPEC-0093

## Context

`verify:strict` exists. EOS lacked a scheduled adversarial probe port that challenges MEASURED claims with sealed findings — without claiming red-team consulting or GH Enterprise enforcement.

Mission CJ delivers a pure Layer-0 Continuous Adversarial Verification Port that:
1. Accepts probe plans with probeId and targets[] `{ claimId, claimedStatus MEASURED|UNKNOWN|BLOCKED }`.
2. Validates plans fail-closed (missing probeId, empty/oversize targets, invalid claim status, Law VI secrets, Fundacion, GHE-enforcement claim labels).
3. Hermetically challenges MEASURED claims (FAIL if evidenceDigest missing/tampered; WARN on weak evidence; INFO when consistent).
4. Decides PASS | CHALLENGE | DENY and seals `CJ-RCPT-*` receipts with findings.
5. Verifies hash-chained custody via `verifyTrail()`. No network / no GH API.

## Decision

1. Implement three Layer-0 modules under `src/core/verification/`:
   - `adversarial-verification-receipt.js`: Canonical nine-field SHA-256 sealed receipts (`CJ-RCPT-*`) via `node:crypto`.
   - `adversarial-verification-policy-gate.js`: Fail-closed probe validation.
   - `adversarial-verification-port.js`: Unified port facade (`probe`, `verifyTrail`, `getProbe`).
2. Consistent MEASURED → PASS; WARN weak evidence → CHALLENGE; FAIL missing/tampered digest or gate reject → DENY.
3. Exclude satellite test suite `tests/eos-cj-adversarial-verification-port.test.js` from default slim discovery; opt-in via `npm run test:mission-cj` / `test:adversarial-verification`.
4. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, ≠ red-team consulting product / ≠ GH Enterprise enforcement.
5. Do **not** rewrite freeze/matrix/dirty-defer/m4 tip pins in this mission (freeze tip stays on CI #350 tip `93c6fdaf…` until SEPARATE tip-refresh).

## Alternatives considered AND REJECTED

### A. Shipping a red-team consulting product surface
**Rejected.** Hermetic Layer-0 probe only; ≠ red-team consulting product.

### B. Claiming GitHub Enterprise enforcement
**Rejected.** NON-CLAIM; gate DENY on GHE-enforcement claim labels. No GH API.

### C. Writing into Fundacion trees during probes
**Rejected.** Fundacion Δ=0 ALWAYS_DENY invariant.

### D. Tip-refresh / freeze tip rewrite inside this mission
**Rejected.** Freeze/matrix tip pin stays on Ladder 25 CI tip until a SEPARATE tip-refresh after CJ merges.

### E. Claiming PRODUCTION_READY=YES
**Rejected.** PRODUCTION_READY=NO for this governed local surface.

## Consequences

- **Positive:** Sealed adversarial probe of MEASURED claims with chained CJ receipts; ~19 hermetic tests; zero secrets; Fundacion Δ=0; L25 axis continued without red-team/GHE claims.
- **Negative:** Probe is a local governed hermetic surface — not a commercial red-team product or GHE enforcement.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI held; L17–L24 never reopen.

## NON-CLAIMS

- Continuous Adversarial Verification Port ≠ red-team consulting product
- ≠ claims GH Enterprise enforcement
- ≠ Fundacion writes (Δ=0)
- PRODUCTION_READY=NO (never flip in this mission)
- ≠ tip-refresh; ≠ Mission CK
