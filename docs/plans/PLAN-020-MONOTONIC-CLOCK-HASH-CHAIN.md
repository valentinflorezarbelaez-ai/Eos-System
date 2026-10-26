# PLAN-020: Monotonic High-Resolution Clock & Cryptographic Hash-Chain Ledger

## Milestone: `SPEC-020-MONOTONIC-CLOCK-HASH-CHAIN`
## Status: APPROVED
## Date: 2026-10-25

---

## 1. Architectural Strategy & Clean Hexagonal Design

```
[ CLI (eos chain verify / eos chain status) ]
                     │
                     ▼
[ Application Layer: HashChainLedgerService (src/core/application/HashChainLedgerService.ts) ]
                     │
                     ▼ (pure domain entities)
[ Domain Layer: HashChainBlock & MonotonicClock ]
(src/core/domain/models/HashChainBlock.ts)
(src/core/domain/models/MonotonicClock.ts)
```

---

## 2. Architectural Decision Records (ADRs)

### ADR-020-01: Monotonic Nanosecond Clocks via Abstract Provider
- **Context:** Node.js supports `process.hrtime.bigint()` which reads hardware CPU counters (monotonic), while pure browser environments use `performance.now()`.
- **Decision:** In the pure domain model (`MonotonicClock.ts`), accept high-precision nanosecond numbers or BigInts, and create an adapter `SystemClock` that bridges to `process.hrtime.bigint()` without polluting the domain layer with Node.js APIs.
- **Alternatives Rejected:**
  - *Directly importing `node:perf_hooks` in the domain model:* Rejected because it violates the Law of Hexagonal Purity (zero `node:` imports in Layer 0).

### ADR-020-02: Merkle-Style Sequential SHA-256 Hash Chaining
- **Context:** We need a tamper-evident audit trail for all evidence records without running a full distributed consensus blockchain.
- **Decision:** Use a lightweight sequential cryptographic hash-chain where each block encapsulates the previous block's SHA-256 hash.
- **Rationale:** O(1) append time, O(N) linear verification time, zero network overhead, mathematically impossible to forge without breaking hash collisions.

---

## 3. Module Boundaries & Data Contracts

### 3.1 Domain Models:
- `src/core/domain/models/MonotonicClock.ts`:
  - `MonotonicTimestamp` interface
  - `MonotonicClock` class (guarantees monotonic progression)
- `src/core/domain/models/HashChainBlock.ts`:
  - `HashChainBlock` immutable class
  - `calculateBlockHash(index, prevHash, payloadHash, monotonicNs)`
  - `verifyChain(blocks: HashChainBlock[])`

### 3.2 Application Service:
- `src/core/application/HashChainLedgerService.ts`:
  - In-memory and file-persisted append-only block ledger (`.eos/ledger/chain.json`)
  - Integration with `EvidenceRecorder` and `TelemetryPipeline`
