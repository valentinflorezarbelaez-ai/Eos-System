# ADR-0009: Canonical Cryptographic Hash-Chained Ledger Designation and Legacy Adapter Compatibility

**Status:** APPROVED (P0 Milestone Resolution)  
**Date:** 2026-08-20  
**Deciders:** Human Director, EOS Senior Systems Architect  
**Technical Scope:** Persistence, Audit Trail, Epistemic Integrity, Crash Recovery  

---

## 1. Context and Problem Statement

EOS currently contains two parallel ledger implementations:
1. **`MissionLedger` (`scripts/engine/mission-ledger.js`)**: Single-process synchronous MVP using `fs.appendFileSync` for unchained JSONL events (`run_log_MIS.jsonl`) and atomic JSON rewrites for `feature_list_MIS.json` with projection to `EOS-MISSION-CONTROL/CURRENT_MISSION.json`.
2. **`HashChainedLedger` (`src/core/sdd/epistemic-evidence-engine.js`)**: Cryptographically chained JSONL event stream enforcing sequential indexing (`sequence: 0, 1, 2...`), SHA-256 event chaining (`previous_hash`), payload hashing (`payload_hash`), genesis block (`0`.repeat(64)), and deterministic tamper detection (`verifyChainIntegrity()`).

Coexistence without canonical designation creates epistemic ambiguity regarding the authoritative source of truth for mission history.

---

## 2. Decision Drivers

- **Cryptographic Provenance**: Audit trails must be tamper-evident and mathematical, not merely append-only.
- **Fail-Closed Verification**: Any corrupted record, partial line write, or byte modification must be detected deterministically.
- **Backwards Compatibility**: Existing CLI and UI projection tools reading `feature_list.json` or `CURRENT_MISSION.json` must not break abruptly during P0.
- **Zero Premature Deletion**: Legacy code must not be deleted until all references, migrations, and crash recovery suites are unified.

---

## 3. Decision

1. **Canonical Designation**: `HashChainedLedger` (`src/core/sdd/epistemic-evidence-engine.js`) is formally designated as the **single canonical persistence ledger and cryptographic source of truth** for EOS Mission OS.
2. **Legacy Compatibility Role**: `MissionLedger` (`scripts/engine/mission-ledger.js`) is designated as a **Legacy Compatibility Adapter**. Its role is restricted to serving legacy read-only projections and atomic feature list views during transition.
3. **Migration Invariant**: In any conflict between unchained legacy logs and hash-chained records, the `HashChainedLedger` cryptographic hash chain governs.

---

## 4. Technical Specifications & Interface

```mermaid
flowchart TD
    A[Orchestration Engine / MCP Tool Call] -->|Record Event / Evidence| B[src/core/sdd/epistemic-evidence-engine.js\nHashChainedLedger (CANONICAL)]
    B -->|Sequence + SHA-256 Hash Chain| C[(run_log_MIS.jsonl\nCryptographic Immutable Store)]
    B -->|verifyChainIntegrity| D{Tamper Check}
    D -->|Chain Valid| E[Event Committed]
    D -->|Tamper / Sequence Gap Detected| F[FAIL CLOSED: TAMPER_DETECTED]

    B -.->|Optional Compatibility Projection| G[scripts/engine/mission-ledger.js\nMissionLedger Adapter (LEGACY)]
    G -.-> H[(feature_list_MIS.json & CURRENT_MISSION.json)]
```

---

## 5. Consequences

### Positive
- Formal mathematical guarantee of log immutability and provenance across all mission lifecycles.
- Clear separation between canonical cryptographic persistence and UI/projection views.
- Zero risk of regression in existing test suites or scripts.

### Negative / Trade-offs
- Two files remain in the repository during P0 until a full projection engine is embedded directly into `HashChainedLedger` in subsequent milestones.
