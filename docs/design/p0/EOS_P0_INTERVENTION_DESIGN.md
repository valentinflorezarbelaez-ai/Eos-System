# EOS P0 ARCHITECTURAL INTERVENTION DESIGN
## Canonical Governance Wiring, Runtime Consolidation & Structural Repair

**Document ID:** `DESIGN-EOS-P0-INTERVENTION-2026`  
**Classification:** `ARCHITECTURE_INTERVENTION_DESIGN`  
**Status:** `DESIGN_PROPOSAL_PENDING_APPROVAL`  
**Mode:** `DESIGN_ONLY (Zero Code Mutation)`  
**Date:** August 27, 2026  

---

## 1. Executive Summary & Root Cause Analysis

The definitive forensic audit confirmed that while EOS possesses exceptional zero-dependency L0 primitives, impenetrable JSON-RPC schema firewalls, and cryptographic proof engines, it suffers from three structural fractures:

1. **State Machine Duality ($\text{FSM}_1 \neq \text{FSM}_2$):** Two independent, un-synchronized state machines exist (`MissionRuntime` 8-state SDD vs `EOSMissionOrchestrator` 7-temple Octaves).
2. **In-Memory Volatility:** The 7-temple orchestrator keeps active mission state in an in-memory `Map()`, causing total state loss across process restarts.
3. **Untracked Git Baseline:** 196+ untracked files prevent clean-room remote reproducibility.
4. **Architecture Theater:** `MissionRuntime` instantiates 40+ academic simulation engines on every constructor invocation.

### The Immutable Design Principle:
$$\boxed{\text{ONE RESPONSIBILITY} \longrightarrow \text{ONE CANONICAL OWNER} \longrightarrow \text{ONE SOURCE OF TRUTH}}$$

---

## 2. The Target Architectural Blueprint

```text
                                HUMAN INTENT
                                     │
                                     ▼
                            [CANONICAL ENTRYPOINTS]
                      ┌──────────────┴──────────────┐
                      │                             │
                 bin/eos.js                  src/mcp-server.js
                 (CLI Driver)                (JSON-RPC Bridge)
                      │                             │
                      └──────────────┬──────────────┘
                                     ▼
                        [CANONICAL MISSION RUNTIME]
                   (src/core/runtime/mission-runtime.js)
                                     │
                     ┌───────────────┼───────────────┐
                     ▼               ▼               ▼
             [INTENT COMPILER]   [DISCOVERY]    [SDD PLANNER]
                     │               │               │
                     └───────────────┬───────────────┘
                                     ▼
                    [CANONICAL STATE MACHINE & ATS]
                (src/core/authority/authority-truth-source.js)
                                     │
                 ┌───────────────────┴───────────────────┐
                 │  SINGLE CANONICAL DISK STORE          │
                 │  .missions/<id>/mission-package.json  │
                 │  .missions/<id>/ledger/ (JSONL DAG)   │
                 └───────────────────┬───────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
        [DERIVED PROVENANCE]                   [DERIVED OCTAVE VIEW]
       (EOSKabbalahLedger DAG)                (Seven Temples Inspector)
                 │                                       │
                 └───────────────────┬───────────────────┘
                                     ▼
                     [AUTHORITY & HITL GATEKEEPER]
                   (Monotonic Ranks: A0, A1, A2, A3)
                                     │
                                     ▼
                    [ISOLATED EXECUTION & SCAFFOLDING]
                   (Clean/Hexagonal + TDD Closed-Loop)
                                     │
                                     ▼
                   [DETERMINISTIC VERIFICATION (AST/Test)]
                  (Tescohan Filter + Triamazikamno Sieve)
                                     │
                                     ▼
                       [CRYPTOGRAPHIC EVIDENCE CHAIN]
                       (docs/evidence/EVD-XXXX.json)
                                     │
                                     ▼
                          [MISSION OUTCOME & CLOSE]
```

---

## 3. Core Intervention Mandates

### Mandate 1: Unified State Machine (Elimination of Duality)
- **Canonical Owner:** `MissionRuntime` backed by `AuthorityTruthSource` and disk persistence in `.missions/<mission_id>/mission-package.json`.
- **Orchestrator Demotion to Derived View:** `EOSMissionOrchestrator` is refactored from an independent state owner to a pure **Octave Lens/Facade** that projects the canonical 8-state SDD lifecycle into the 7-temple metaphysical view without storing private state in RAM.

### Mandate 2: Sefirotic DAG as Canonical Ledger Adapter
- `EOSKabbalahLedger` ceases to be a detached standalone script and becomes the official storage engine for `.missions/<mission_id>/ledger/events.jsonl`, binding every state transition to `Kether` (Intent), `Geburah` (Test/Rigor), and `Tiphereth` (Code/Beauty).

### Mandate 3: Pruning of Architecture Theater
- The 40+ experimental simulation engines in `MissionRuntime.constructor` (Raft consensus, mini VM, LSM tree, SreChaos) are decoupled from the core runtime constructor and quarantined under `EOS-Lab/` or loaded strictly on-demand in specialized test fixtures.

### Mandate 4: Canonical Git Boundary Classification
- All 196+ untracked files are classified into exact deterministic sets:
  - `REQUIRED_FOR_CANONICAL` (Specs, Core Modules, Canonical Tests) $\rightarrow$ Added to release.
  - `EXPERIMENTAL` $\rightarrow$ Relocated to `EOS-Lab/`.
  - `LOCAL_ONLY` $\rightarrow$ Added to `.gitignore`.
  - `DEAD` $\rightarrow$ Quarantined.
