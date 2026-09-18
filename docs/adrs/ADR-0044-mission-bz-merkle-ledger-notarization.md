# ADR-0044 — Mission BZ Continuous Cryptographic Ledger Merkle Notarization Port

- **Status:** Accepted — local governed (Ladder 23 Satellite 4)
- **Date:** 2026-09-18
- **Deciders:** EOS local governed use (Sovereign Autonomous Synthesis, Distributed Invariant Consensus & Self-Reification Fabric)
- **Spec:** SPEC-0083

## Context

Ladders 11 through 22 are formally CLOSED_FOR_LOCAL_GOVERNED_USE and sealed against modification.
Ladder 23 establishes the **Sovereign Autonomous Synthesis, Distributed Invariant Consensus & Self-Reification Fabric**.
Mission BY (SPEC-0082) delivered autonomous EARS/BDD spec synthesis. Sequential receipt chains still require O(N) traversal for inclusion checks.

Mission BZ delivers a pure Layer-0 continuous cryptographic ledger Merkle notarization port that:
1. Ingests ordered leaf event/receipt digests (or payloads hashed to digests).
2. Builds a binary Merkle tree (SHA-256) with Bitcoin-style odd-node duplication.
3. Emits a Merkle root plus sealed `BZ-RCPT-*` receipts with nine-field SHA-256 custody.
4. Provides O(log N) inclusion proofs (`proveInclusion` / `verifyInclusion`).
5. Screens for plain secrets (Law VI) and enforces the Fundacion write barrier (`FUNDACION_ALWAYS_DENY`).
6. Verifies hash-chained custody via `verifyTrail()`.

## Decision

1. Implement three Layer-0 modules under `src/core/audit/`:
   - `merkle-ledger-receipt.js`: Canonical nine-field SHA-256 sealed receipts (`BZ-RCPT-*`) via `node:crypto`.
   - `merkle-ledger-policy-gate.js`: Fail-closed batch validation (non-empty, max size, digest/payload, Law VI, Fundacion).
   - `merkle-ledger-notarization-port.js`: Unified port facade (`notarize`, `proveInclusion`, `verifyInclusion`, `verifyTrail`, `getNotarization`).
2. Odd-node strategy: **Bitcoin-style duplicate-last** (`BZ_ODD_NODE_STRATEGY = 'BITCOIN_DUPLICATE_LAST'`). Documented in module header and ADR.
3. Exclude satellite test suite `tests/eos-bz-merkle-ledger-notarization-port.test.js` from default slim discovery via `scripts/test-runner.js` and provide dedicated opt-in `npm run test:mission-bz` / `test:merkle-ledger`.
4. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Merkle ledger ≠ public blockchain / ≠ cryptocurrency, zero external npm dependencies.

## Alternatives considered AND REJECTED

### A. Public blockchain / cryptocurrency anchoring
**Rejected.** EOS does not claim public-chain settlement, token economics, or cryptocurrency semantics.
Technical reason: Local Layer-0 Merkle notarization provides deterministic inclusion proofs without network consensus or monetary claims.

### B. Equal-padding with zero hashes for odd nodes
**Rejected** in favor of Bitcoin-style duplicate-last for familiarity and deterministic path construction without introducing a sentinel zero digest.
Technical reason: Duplicate-last is well-documented and keeps proof reconstruction identical to Bitcoin Merkle paths.

## Consequences

- **Positive:** O(log N) inclusion proofs; sealed BZ receipts; 20/20 hermetic tests; zero secrets; Fundacion Δ=0.
- **Negative:** Odd-leaf batches duplicate the last node (Bitcoin semantics must be understood by verifiers).
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI held.

## NON-CLAIMS

- Merkle ledger ≠ public blockchain
- Merkle ledger ≠ cryptocurrency
- PRODUCTION_READY=NO (never flip in this mission)
