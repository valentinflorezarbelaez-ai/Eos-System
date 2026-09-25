# Design — Mission DR: Deterministic Autonomous Execution Loop Controller Port (SPEC-0128)

## 1. Architecture Overview

Mission DR delivers the Deterministic Autonomous Execution Loop Controller Port inside Layer 0 (`src/core/composition/`).

Components:
- `execution-loop-controller-receipt.js`: Canonical sealed 9-field `DR-RCPT-*` receipt with `loopDigest`.
- `execution-loop-controller-policy-gate.js`: Policy gate evaluating plan preconditions, enforcing sequential 7-phase state transitions, and gating `VERIFIED` on `allChecksPassed === true`.
- `execution-loop-controller-port.js`: Port module exposing `govern(input)` and `verifyTrail()`.

## 2. Invariants & Controls

- Node.js built-ins only (`node:crypto`). Zero external dependencies.
- `freezeObserve` pin pinned to tip `898aa96a` (Mission DQ tip).
- Schemas strictly held at `AT_CEILING 35/35`.
