# LIVING SPECIFICATION: MISSION RUNTIME PRUNING & LAZY ENGINE CONSOLIDATION

**Mission ID:** `MIS-RNT-PRN-001`  
**Status:** `VALIDATED_LOCAL_CANARY`  
**Policy:** `L0_NODE_BUILTINS_ONLY`  
**Target Invariant:** Lean Core (Maximum 8 Active Engines in Genesis Constructor)

---

## 1. EARS Requirements

- **[REQ-EARS-PRN-01] (Ubiquitous - Lean Core Constructor)**:  
  **WHEN** the `MissionRuntime` class is instantiated,  
  **THE SYSTEM SHALL** only initialize the 8 verified core operations engines within its synchronous constructor code body (`ats`, `hitl`, `integrationGate`, `schemas`, `rules`, `fdir`, `reporter`, `orchestrator`).

- **[REQ-EARS-PRN-02] (Event-Driven - On-Demand Lazy Initialization)**:  
  **WHEN** a secondary or experimental engine (such as `raftSimulator` or `lsmTreeEngine`) is requested by a tool call or operation,  
  **THE SYSTEM SHALL** load and instantiate that specific module on-demand using a lazy initialization pattern, preventing pre-boot memory footprint pollution.

---

## 2. BDD Acceptance Criteria

```gherkin
Feature: MissionRuntime Lean Pruning and Lazy Engine Loading
  Scenario: Constructor initializes only the 8 core engines
    Given a new MissionRuntime instance
    When inspecting the synchronous constructor state
    Then activeCoreEngineCount equals 8
    And secondary engines are absent from enumerable keys

  Scenario: Secondary engine loads dynamically upon access
    Given a clean MissionRuntime instance
    When querying a secondary engine property such as raftSimulator
    Then the engine hydrates on demand without throwing
    And returns an active engine instance
```
