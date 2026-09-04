# EOS P3.6 Technical Specification: Ledger Crash Recovery, Concurrency & Operational Persistence

**Document ID:** SPEC-P3-6-001  
**Status:** CANONICAL_IMPLEMENTATION_SPEC  
**Date:** 2026-08-20  
**Authority:** Human Director & EOS Senior Systems Architect  

---

## 1. Overview & Architecture

Milestone P3.6 hardens the **Canonical Hash-Chained Mission Ledger (`src/core/sdd/epistemic-evidence-engine.js`)** to guarantee operational persistence, concurrency isolation, and crash resilience across multi-agent mission executions:

```text
       Concurrent Agent Append Calls
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Advisory File Locking                       │
│   - Exclusive lockfile (.lock) with timeout & stale breaker │
│   - Serializes concurrent writes to single sequence line    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Atomic Append + fsyncSync                   │
│   - Formulates SHA-256 header and event hash                │
│   - Writes JSONL entry and flushes physically to disk       │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       Normal Verification              Crash Recovery & Repair
   (verifyChainIntegrity)         (recoverAndRepairLedger)
   - 0..N sequence unbroken       - Trailing partial line ──► Safe Truncate
   - Hash links verified          - Middle corruption     ──► Fail Closed
```

---

## 2. Invariants & Resilience Mechanisms

| Mechanism | Implementation | Guarantee |
|---|---|---|
| **Advisory File Locking** | `_acquireLock` with `wx` flag and 3000ms timeout | Eliminates race conditions between simultaneous agent writers; 0 lost events. |
| **Stale Lock Recovery** | Automatic cleanup of dead lockfiles older than 5000ms | Prevents deadlocks if an agent process dies while holding the lock. |
| **Physical Disk Flush** | `fsyncSync(fd)` on every event append | Survives sudden power loss or process kill without file buffer loss. |
| **Trailing Crash Recovery** | `recoverAndRepairLedger(missionId)` | Truncates trailing half-written JSON lines safely to the last verified block. |
| **Fail-Closed on Middle Corruption** | Throws `FAIL_CLOSED_CORRUPTED_MIDDLE_BLOCK` | Prevents guessing or silent alteration of historical ledger events. |
| **Replay State Rehydration** | `replayAndRecover(missionId)` | Reconstructs the exact mission state and sequence from verified ledger history. |

---

## 3. Empirical Persistence Assessment

- **Conclusion**: The hardened JSONL engine with advisory file locking, `fsyncSync`, and trailing truncation recovery provides complete crash resilience and concurrency safety for local multi-agent operations. Migration to SQLite WAL is **not required** for current local single-node multi-agent coordination.

---

## 4. Epistemic Claim Permitted

> **EOS can persist, lock, and cryptographically verify mission ledger events across concurrent agent operations, recover safely from trailing write crashes, and fail closed upon historical tampering.**
