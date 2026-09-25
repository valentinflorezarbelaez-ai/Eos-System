# Design — Mission DP: Sovereign Vertical Slice & Screaming Architecture Port (SPEC-0126)

## 1. Architecture Overview

Mission DP delivers the Sovereign Vertical Slice & Screaming Architecture Port inside Layer 0 (`src/core/composition/`).

Components:
- `vertical-slice-receipt.js`: Canonical sealed 9-field `DP-RCPT-*` receipt with `sliceDigest`.
- `vertical-slice-policy-gate.js`: Policy gate evaluating plan preconditions, ensuring screaming architecture compliance and preventing leakage.
- `vertical-slice-port.js`: Port module exposing `govern(input)` and `verifyTrail()`.

## 2. Invariants & Controls

- Node.js built-ins only (`node:crypto`). Zero external dependencies.
- `freezeObserve` pin pinned to tip `8bbdd522` (Ladder 32 Audit tip).
- Schemas strictly held at `AT_CEILING 35/35`.
