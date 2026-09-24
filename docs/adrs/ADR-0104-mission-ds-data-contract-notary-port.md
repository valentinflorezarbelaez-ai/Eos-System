# ADR-0104 — Mission DS Contract-First Formal Data Contract Notary Port

- **Status:** Accepted — local governed (Ladder 32 Satellite 4)
- **Date:** 2026-09-24
- **Deciders:** EOS local governed use (Sovereign Screaming Architecture & Deterministic Agentic Execution Fabric)
- **Spec:** SPEC-0129
- **Prior ADRs:** ADR-0100 (Ladder 32 Audit), ADR-0101 (Mission DP), ADR-0102 (Mission DQ), ADR-0103 (Mission DR)

## Context

In complex distributed architectures and multi-agent systems, unvalidated data contracts and open-ended payloads result in anemic domains, runtime type errors, and boundary leakage. Inspired by LIDR Academy and Gentleman Programming doctrine, all boundary communications must be mediated by explicit, versioned, contract-first data schemas. Mission DS provides a dedicated Layer-0 notary port that verifies payloads against strict data contracts, rejecting schema drift and uncontracted payload injection.

## Decision

1. **Implement Pure Layer-0 Triad (`src/core/composition/data-contract-notary-*.js`)**:
   - `data-contract-notary-receipt.js`: Canonical sealed 9-field `DS-RCPT-*` receipt generator with soft-observe pin `2ff91794`.
   - `data-contract-notary-policy-gate.js`: Policy gate evaluating plan preconditions, enforcing schema strictness, detecting schema drift, blocking uncontracted field injection, and enforcing Law IV (`FUNDACION_ALWAYS_DENY`) and Law VI.
   - `data-contract-notary-port.js`: Pure Layer-0 port orchestrating data contract notarization and maintaining a cryptographic receipt trail.

2. **Implement Test Suite (`tests/eos-ds-data-contract-notary-port.test.js`)**:
   - 17 hermetic tests (DS1–DS17) covering receipts, gates, and port behavior.
   - Registered in `package.json` as `test:mission-ds` and `test:data-contract-notary`.
   - Excluded from slim runner via `SLIM_SUITE_EXCLUDES` in `scripts/test-runner.js`.

3. **Invariants & Non-Claims**:
   - `PRODUCTION_READY = 'NO'`.
   - `Fundacion Δ=0`.
   - Law VI held (synthetic secret tokens in tests).
   - Schemas strictly held at `AT_CEILING 35/35`.
   - Ladders 17–31 permanently CLOSED — never reopen.

## Alternatives REJECTED

- Accepting open-ended JSON without schema verification — REJECTED: violates contract-first principle.
- Permitting uncontracted field injection — REJECTED: causes silent schema degradation.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED: strict non-claim.

## Consequences

- Positive: All system boundaries validate incoming data structures against immutable, notarized data contracts.
- Invariants Preserved: All 914+ strict verification invariants hold cleanly.
