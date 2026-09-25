# Design — Mission DN: Sovereign Epistemic Knowledge Ledger Port

## Architecture Overview

Mission DN implements an authoritative composition port within Clean Architecture Layer 0 (`src/core/composition/`).

```text
Epistemic State Transition / Memory Ledger
               │
               ▼
┌────────────────────────────────────────────────────────┐
│      SovereignEpistemicLedgerPort                      │
│                                                        │
│   ┌────────────────────────────────────────────────┐   │
│   │   SovereignEpistemicLedgerPolicyGate           │   │
│   │   - Law VI secrets scan                        │   │
│   │   - Fundacion Δ=0 barrier                      │   │
│   │   - AUDIT_EXECUTED -> VERIFIED state gate      │   │
│   │   - checksPassed > 0 & evidenceHash gate       │   │
│   │   - L30/L29 closed invariant                   │   │
│   │   - Non-claim enforcement                      │   │
│   └────────────────────────────────────────────────┘   │
│                          │                             │
│                          ▼                             │
│   ┌────────────────────────────────────────────────┐   │
│   │   buildSovereignEpistemicLedgerReceipt         │   │
│   │   - Canonical 9-field seal                     │   │
│   │   - Cryptographic SHA-256 epistemicDigest      │   │
│   │   - Freeze soft-observe pin (079e6f2a)         │   │
│   │   - DN-RCPT-XXXX                               │   │
│   └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

## Module Specifications

### 1. `sovereign-epistemic-ledger-receipt.js`
- Canonical nine-field seal:
  `{ receiptId, operation, planId, decision, changeId, epistemicDigest, timestamp, fundacionDelta, prevReceiptHash }`
- Attached properties:
  `ritualMode`, `epistemicReport`, `freezeObserve`, `ceilingHold`, `epistemicHold`, `receiptHash`, `prevReceiptHash`
- Verification logic checks field equivalence, kind, operation, and recomputed SHA-256 hash.

### 2. `sovereign-epistemic-ledger-policy-gate.js`
- Fail-closed evaluation.
- Recursively strips prior receipts before string/pattern inspections to avoid false positives.
- Rejects invalid state transitions (only `AUDIT_EXECUTED` or `REVALIDATION_REQUIRED` ➔ `VERIFIED` allowed).
- Rejects ungrounded claims (`checksPassed <= 0` or missing `evidenceHash`).
- Enforces Law VI, Fundacion write barrier, and refuses tip rewrite or PR flip.

### 3. `sovereign-epistemic-ledger-port.js`
- Implements `govern(input)` returning `{ ok, decision, code, receipt }`.
- Implements `verifyTrail()` checking cryptographic chaining across sequential receipts.
