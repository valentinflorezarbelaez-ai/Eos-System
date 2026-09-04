# LIVING SPECIFICATION: SCAFFOLDER AUTOMATED CLOSED-LOOP TDD EXECUTOR (MCP INTERFACE)

**Mission ID:** `MIS-SCAF-TDD-002`  
**Status:** `VALIDATED_LOCAL_CANARY`  
**Policy:** `L0_NODE_BUILTINS_ONLY`  
**Authority gate:** Human PO approval required.

---

## 1. EARS Requirements

- **[REQ-EARS-TDD-01] (Event-Driven - Synchronous Test Runner Trigger)**:  
  **WHEN** the automated TDD engine targets a module under development,  
  **THE SYSTEM SHALL** synchronously execute the Node.js native test runner over the component's test file.

- **[REQ-EARS-TDD-02] (Error-Condition - Fault Interception & Patch Application)**:  
  **IF** the test runner fails with a non-zero exit code,  
  **THE SYSTEM SHALL** capture the stderr or stdout output, pass the error context to the fix routine, modify the source code, and re-run the loop up to a maximum of 5 iterations.

- **[REQ-EARS-TDD-03] (State-Driven - Green Convergence & Receipt Sealing)**:  
  **WHEN** the test runner returns exit code 0 (all assertions pass),  
  **THE SYSTEM SHALL** break the loop, mark the execution as `TDD_AUTO_HEALED_GREEN`, and seal the outcome with an immutable hash block.

- **[REQ-EARS-TDD-04] (Ubiquitous - MCP JSON-RPC Interface Binding)**:  
  **WHEN** the system receives an MCP call to `eos.scaffolder.execute`,  
  **THE SYSTEM SHALL** invoke the sifting loop of the `EOSTDDExecutor` inside a secure, monitored process context.

- **[REQ-EARS-TDD-05] (Error-Condition - MCP Budget Exceeded Error Return)**:  
  **IF** the execution results in `TDD_BUDGET_EXCEEDED`,  
  **THE SYSTEM SHALL** return a structured JSON-RPC error payload declaring the precise assertion stderr trace, preventing data pollution and stopping downstream promotions.

---

## 2. BDD Acceptance Criteria

```gherkin
Feature: Scaffolder Automated Closed-Loop TDD Executor (MCP Interface)
  Scenario: Failing test is iteratively patched until assertions pass
    Given a scaffolded component with a failing assertion in its test file
    When the TDD executor runs the automated closed loop
    Then the patch routine is applied on failure
    And the runner verifies the corrected code on the next iteration
    And status converges to TDD_AUTO_HEALED_GREEN

  Scenario: MCP tool call triggers TDD auto-healing
    Given a valid MCP request to eos.scaffolder.execute
    When the target module has a resolvable bug
    Then the MCP tool returns a successful green resolution payload
    And registers the transaction in the ledger
```
