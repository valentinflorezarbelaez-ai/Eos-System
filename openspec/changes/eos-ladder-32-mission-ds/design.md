# Design — Mission DS: Contract-First Formal Data Contract Notary Port (SPEC-0129)

## 1. Architecture Overview

Mission DS delivers the Contract-First Formal Data Contract Notary Port inside Layer 0 (`src/core/composition/`).

Components:
- `data-contract-notary-receipt.js`: Canonical sealed 9-field `DS-RCPT-*` receipt with `contractDigest`.
- `data-contract-notary-policy-gate.js`: Policy gate evaluating plan preconditions, validating data contracts, and forbidding schema drift or uncontracted injection.
- `data-contract-notary-port.js`: Port module exposing `govern(input)` and `verifyTrail()`.

## 2. Invariants & Controls

- Node.js built-ins only (`node:crypto`). Zero external dependencies.
- `freezeObserve` pin pinned to tip `2ff91794` (Mission DR tip).
- Schemas strictly held at `AT_CEILING 35/35`.
