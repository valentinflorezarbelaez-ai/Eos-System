# Design — Mission DK: SpecBoot Mutation Testing Gatekeeper Port

## Architecture Overview

Mission DK implements an authoritative composition port within Clean Architecture Layer 0 (`src/core/composition/`).

```text
SpecBoot Verify Phase / Audit Gate
               │
               ▼
┌────────────────────────────────────────────────────────┐
│      SpecbootMutationGatekeeperPort                   │
│                                                        │
│   ┌────────────────────────────────────────────────┐   │
│   │   SpecbootMutationGatekeeperPolicyGate         │   │
│   │   - Law VI secrets scan                        │   │
│   │   - Fundacion Δ=0 barrier                      │   │
│   │   - Zero survived mutants gate                 │   │
│   │   - L30/L29 closed invariant                   │   │
│   │   - Non-claim enforcement                      │   │
│   └────────────────────────────────────────────────┘   │
│                          │                             │
│                          ▼                             │
│   ┌────────────────────────────────────────────────┐   │
│   │   buildSpecbootMutationGatekeeperReceipt       │   │
│   │   - Canonical 9-field seal                     │   │
│   │   - Cryptographic SHA-256 mutationDigest       │   │
│   │   - Freeze soft-observe pin (2cead226)         │   │
│   │   - DK-RCPT-XXXX                               │   │
│   └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

## Module Specifications

### 1. `specboot-mutation-gatekeeper-receipt.js`
- Canonical nine-field seal:
  `{ receiptId, operation, planId, decision, changeId, mutationDigest, timestamp, fundacionDelta, prevReceiptHash }`
- Attached properties:
  `ritualMode`, `mutationReport`, `freezeObserve`, `ceilingHold`, `mutationHold`, `receiptHash`, `prevReceiptHash`
- Verification logic checks field equivalence, kind, operation, and recomputed SHA-256 hash.

### 2. `specboot-mutation-gatekeeper-policy-gate.js`
- Fail-closed evaluation.
- Recursively strips prior receipts before string/pattern inspections to avoid false positives.
- Rejects surviving mutants (`survivedMutants > 0`).
- Rejects unverified status (`status !== 'VERIFIED'`).
- Enforces Law VI, Fundacion write barrier, and refuses tip rewrite or PR flip.

### 3. `specboot-mutation-gatekeeper-port.js`
- Implements `govern(input)` returning `{ ok, decision, code, receipt }`.
- Implements `verifyTrail()` checking cryptographic chaining across sequential receipts.
