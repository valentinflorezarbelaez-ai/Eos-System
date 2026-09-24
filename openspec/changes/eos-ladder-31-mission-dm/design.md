# Design — Mission DM: Hexagonal Architecture Boundary Isolation Port

## Architecture Overview

Mission DM implements an authoritative composition port within Clean Architecture Layer 0 (`src/core/composition/`).

```text
Module Dependency Analysis / AST Scan
               │
               ▼
┌────────────────────────────────────────────────────────┐
│      HexagonalBoundaryIsolationPort                    │
│                                                        │
│   ┌────────────────────────────────────────────────┐   │
│   │   HexagonalBoundaryIsolationPolicyGate         │   │
│   │   - Law VI secrets scan                        │   │
│   │   - Fundacion Δ=0 barrier                      │   │
│   │   - Zero boundary violations gate              │   │
│   │   - NODE_BUILTINS_ONLY purity gate             │   │
│   │   - L30/L29 closed invariant                   │   │
│   │   - Non-claim enforcement                      │   │
│   └────────────────────────────────────────────────┘   │
│                          │                             │
│                          ▼                             │
│   ┌────────────────────────────────────────────────┐   │
│   │   buildHexagonalBoundaryIsolationReceipt       │   │
│   │   - Canonical 9-field seal                     │   │
│   │   - Cryptographic SHA-256 boundaryDigest       │   │
│   │   - Freeze soft-observe pin (f367a1cf)         │   │
│   │   - DM-RCPT-XXXX                               │   │
│   └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

## Module Specifications

### 1. `hexagonal-boundary-isolation-receipt.js`
- Canonical nine-field seal:
  `{ receiptId, operation, planId, decision, changeId, boundaryDigest, timestamp, fundacionDelta, prevReceiptHash }`
- Attached properties:
  `ritualMode`, `boundaryReport`, `freezeObserve`, `ceilingHold`, `boundaryHold`, `receiptHash`, `prevReceiptHash`
- Verification logic checks field equivalence, kind, operation, and recomputed SHA-256 hash.

### 2. `hexagonal-boundary-isolation-policy-gate.js`
- Fail-closed evaluation.
- Recursively strips prior receipts before string/pattern inspections to avoid false positives.
- Rejects boundary violations (`violationsCount > 0` or non-empty `violations`).
- Rejects non-isolated status (`boundaryIntegrityStatus !== 'ISOLATED'`).
- Rejects non-builtin imports in Layer 0 (`nonBuiltinImportsCount > 0`).
- Enforces Law VI, Fundacion write barrier, and refuses tip rewrite or PR flip.

### 3. `hexagonal-boundary-isolation-port.js`
- Implements `govern(input)` returning `{ ok, decision, code, receipt }`.
- Implements `verifyTrail()` checking cryptographic chaining across sequential receipts.
