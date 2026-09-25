# Design — Mission DL: Adversarial Invariant Refuter Port

## Architecture Overview

Mission DL implements an authoritative composition port within Clean Architecture Layer 0 (`src/core/composition/`).

```text
Spec Proposal / Pre-Apply Verification
               │
               ▼
┌────────────────────────────────────────────────────────┐
│      AdversarialInvariantRefuterPort                   │
│                                                        │
│   ┌────────────────────────────────────────────────┐   │
│   │   AdversarialInvariantRefuterPolicyGate        │   │
│   │   - Law VI secrets scan                        │   │
│   │   - Fundacion Δ=0 barrier                      │   │
│   │   - Zero unhandled breaches gate               │   │
│   │   - L30/L29 closed invariant                   │   │
│   │   - Non-claim enforcement                      │   │
│   └────────────────────────────────────────────────┘   │
│                          │                             │
│                          ▼                             │
│   ┌────────────────────────────────────────────────┐   │
│   │   buildAdversarialInvariantRefuterReceipt      │   │
│   │   - Canonical 9-field seal                     │   │
│   │   - Cryptographic SHA-256 refutationDigest     │   │
│   │   - Freeze soft-observe pin (20cb9abd)         │   │
│   │   - DL-RCPT-XXXX                               │   │
│   └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

## Module Specifications

### 1. `adversarial-invariant-refuter-receipt.js`
- Canonical nine-field seal:
  `{ receiptId, operation, planId, decision, changeId, refutationDigest, timestamp, fundacionDelta, prevReceiptHash }`
- Attached properties:
  `ritualMode`, `refutationReport`, `freezeObserve`, `ceilingHold`, `refutationHold`, `receiptHash`, `prevReceiptHash`
- Verification logic checks field equivalence, kind, operation, and recomputed SHA-256 hash.

### 2. `adversarial-invariant-refuter-policy-gate.js`
- Fail-closed evaluation.
- Recursively strips prior receipts before string/pattern inspections to avoid false positives.
- Rejects unhandled invariant breaches (`unhandledBreaches > 0`).
- Rejects compromised resilience status (`resilienceStatus === 'COMPROMISED'`).
- Supports CHALLENGE decision when warnings are detected and allowChallengeMode is true.
- Enforces Law VI, Fundacion write barrier, and refuses tip rewrite or PR flip.

### 3. `adversarial-invariant-refuter-port.js`
- Implements `govern(input)` returning `{ ok, decision, code, receipt }`.
- Implements `verifyTrail()` checking cryptographic chaining across sequential receipts.
