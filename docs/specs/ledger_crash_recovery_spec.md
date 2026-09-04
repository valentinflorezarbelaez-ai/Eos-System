# LIVING SPECIFICATION: LEDGER CRASH RECOVERY & INTEGRITY REPAIR

**Mission ID:** `MIS-LDG-REC-001`  
**Status:** `VALIDATED_LOCAL_CANARY`  
**Policy:** `L0_NODE_BUILTINS_ONLY`  
**Authority gate:** Human PO approval required.

---

## 1. EARS Requirements

- **[REQ-EARS-REC-01] (Event-Driven - Recalculate Hash Chain)**:  
  **WHEN** the system boots or reads the local mission ledger,  
  **THE SYSTEM SHALL** recalculate the SHA-256 chain from the genesis block to the last record to verify structural integrity.

- **[REQ-EARS-REC-02] (Error-Condition - Mid-Write Tail Crash Repair)**:  
  **IF** a corrupted, partial, or malformed JSON record is detected at the tail of the ledger file (due to a mid-write crash),  
  **THE SYSTEM SHALL** isolate the fault, truncate the file at the last mathematically valid state, and report the recovered state block.

- **[REQ-EARS-REC-03] (Error-Condition - Intermediate Mutation Trapping)**:  
  **IF** corruption is detected in an intermediate block of the ledger (unauthorized mutation),  
  **THE SYSTEM SHALL** throw a fatal cryptographic panic (`PROVENANCE_VIOLATION`) and lock execution to prevent data provenance pollution.

---

## 2. BDD Acceptance Criteria

```gherkin
Feature: Ledger Crash Recovery
  Scenario: Mid-write truncated line at tail is isolated and recovered
    Given a ledger file with 2 valid sealed blocks and 1 truncated line at the end
    When the ledger recovery manager audits the file
    Then the system recovers exactly 2 valid blocks
    And the file is cleanly truncated to the last verified state
    And status is marked as RECOVERED_NOMINAL

  Scenario: Intermediate data corruption triggers fatal panic
    Given a ledger file where block 1 has been illegally mutated after sealing
    When the ledger recovery manager audits the file
    Then a fatal cryptographic panic is thrown mentioning "PROVENANCE_VIOLATION"
```
