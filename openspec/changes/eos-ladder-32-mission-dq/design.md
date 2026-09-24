# Design — Mission DQ: Autonomous Property-Based Generative Fuzzing Port (SPEC-0127)

## 1. Architecture Overview

Mission DQ delivers the Autonomous Property-Based Generative Fuzzing Port inside Layer 0 (`src/core/composition/`).

Components:
- `property-fuzzing-receipt.js`: Canonical sealed 9-field `DQ-RCPT-*` receipt with `fuzzDigest`.
- `property-fuzzing-policy-gate.js`: Policy gate evaluating plan preconditions, ensuring minimum iterations and zero falsifying counterexamples.
- `property-fuzzing-port.js`: Port module exposing `govern(input)` and `verifyTrail()`.

## 2. Invariants & Controls

- Node.js built-ins only (`node:crypto`). Zero external dependencies.
- `freezeObserve` pin pinned to tip `fc9a0c20` (Mission DP tip).
- Schemas strictly held at `AT_CEILING 35/35`.
