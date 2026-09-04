# LIVING SPECIFICATION: MASTER PIPELINE ATOMIC ROLLBACK & FAULT CONTAINMENT

**Mission ID:** `MIS-ORCH-RBK-001`  
**Status:** `VALIDATED_LOCAL_CANARY`  
**Policy:** `L0_NODE_BUILTINS_ONLY`  
**Authority gate:** Human PO approval required before promotion to STABLE.

---

## 1. EARS Requirements

- **[REQ-EARS-RBK-01] (Event-Driven - Physical File Purge on Abort)**:  
  **WHEN** an operational transition fails or an explicit request to abort is received via `eos.orchestrator.rollback`,  
  **THE SYSTEM SHALL** synchronously delete any physical files scaffolded or mutated during that specific octave layer.

- **[REQ-EARS-RBK-02] (State-Driven - Controlled State Degradation)**:  
  **WHEN** the file system purge completes,  
  **THE SYSTEM SHALL** degrade the active mission status to the immediate previous valid planetary temple in the `sevenTemples` sequence.

- **[REQ-EARS-RBK-03] (Ubiquitous - Cryptographic Containment Receipt Sealing)**:  
  **WHEN** the state degradation is complete,  
  **THE SYSTEM SHALL** compile an immutable cryptographic containment receipt using `EOSMissionOntologyCore` and append it to the ledger history with the outcome `MISSION_FAULT_CONTAINED`.

---

## 2. BDD Acceptance Criteria

```gherkin
Feature: Master Pipeline Atomic Rollback
  Scenario: Failed octave execution triggers clean truncation and state rollback
    Given an active mission currently at the 'TDD_FRAGUA_ROJO' temple with scaffolded mock files
    When the rollback manager is invoked with a valid missionId and failure reason
    Then the system physically deletes the scaffolded files from disk
    And the mission state degrades cleanly back to 'ARCH_GEOMETRY'
    And a sealed containment block is written to the ledger history
```
