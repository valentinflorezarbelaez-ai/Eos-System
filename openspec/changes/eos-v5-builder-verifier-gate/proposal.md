# Proposal — eos-v5-builder-verifier-gate

## Goal
Implement Ladder 10 V5: Runtime Enforcement of the Constitutional Rule `BUILDER != VERIFIER`.
Ensure independent verification is guaranteed deterministically at the code and custody level, rejecting self-certification across all SDD verification receipts and hash-chained custody seals.

## Context & Problem
EOS Constitution §3, ADR-0010, and Law III mandate that an agent who builds code (`/apply`) may never certify its own success or issue verification decisions (`/verify`).
While procedural rules existed, runtime checks were previously decentralized:
1. `AgentHandoffEnvelope` (V3) validated disjunction on phase handoff envelopes.
2. `tdd-evidence-receipt.js` rejected `APPLY_BUILDER_NOT_VERIFIER` as a verifier ID.
3. However, `EvidenceCustody.sealVerifyReceipt()` and SDD task verification did not enforce that `builder_id !== verifier_id` fail-closed when sealing verification records.

## Proposed Changes
1. **Custody Disjunction Validator (`src/core/governance/builder-verifier-custody.js`)**:
   - Pure Tier 2 function `assertBuilderVerifierDisjunction({ builder_id, verifier_id })`.
   - Rejects identical or placeholder IDs with `BUILDER_EQUALS_VERIFIER_VIOLATION`.
   - Validates verification receipt objects via `validateVerificationReceiptCustody(receipt)`.
2. **Runtime Enforcement in `src/core/sdd/evidence-custody.js`**:
   - `EvidenceCustody.prototype.sealVerifyReceipt()` checks disjunction before appending to the hash-chained ledger.
3. **Dedicated Gate Runner (`scripts/ci/builder-verifier-custody-gate.js`)**:
   - Executes non-mutating simulation testing edge cases (identity collisions, missing IDs, valid distinct pairs).
   - Returns structured report with `PRODUCTION_READY=NO`.
4. **Comprehensive Test Suite (`tests/eos-v5-builder-verifier-custody.test.js`)**:
   - Tests `assertBuilderVerifierDisjunction`, `validateVerificationReceiptCustody`, `EvidenceCustody` integration, and gate runner.
5. **CI Seam-Pack Wiring**:
   - Expose `test:v5` in `package.json`.
   - Wire `npm run test:v5` into `.github/workflows/ci.yml` seam-pack.
   - Document in `docs/governance/CI_CD_CONTRACT.md`.

## Non-Claims & Constraints
- `PRODUCTION_READY`: Remains **NO**.
- `Fundacion` and `App de Fuerza`: `Delta=0`.
- Complexity Budget: `AT_CEILING` (35/35 schemas) strictly preserved.
