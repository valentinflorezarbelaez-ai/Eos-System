# LIVING SPECIFICATION: MCP TOOL #71 — EOS.ENVIRONMENT.SANDBOX.EXECUTE (EPHEMERAL MICROVM SANDBOX & REPL EXECUTION HARNESS)

**Mission ID:** `MIS-MCP-SND-071`  
**Tool Name:** `eos.environment.sandbox.execute`  
**Category:** `INFRASTRUCTURE`  
**Side Effects:** `LEDGER_WRITE`  
**Required Authority:** `A1`  
**Status:** `VALIDATED_LOCAL_CANARY`  
**Target Invariant:** Zero-Trust MicroVM Isolation, Deterministic REPL Error Capture, and Zero-Waste Memory Deallocation

---

## 1. Conscious Purpose
Tool #71 (*The Ephemeral Sandbox & REPL Harness*) provides an isolated, zero-trust execution harness (gVisor/WASM/MicroVM) for autonomous SDD code compilation, test suite execution, and automated self-healing loops without compromising the host environment or persistent workspace state.

---

## 2. Input JSON Schema
```json
{
  "type": "object",
  "properties": {
    "agentTaskId": {
      "type": "string",
      "description": "Identificador único de la tarea atómica derivada del SDD."
    },
    "executionCommand": {
      "type": "string",
      "description": "El comando de terminal (node --test, npm run compile) a ejecutar."
    },
    "sandboxConfiguration": {
      "type": "object",
      "properties": {
        "efhemeralContainerActive": { "type": "boolean", "description": "Fuerza el despliegue de una microVM aislada." },
        "isolationLockdownLevel": { "type": "integer", "minimum": 1, "maximum": 3, "description": "Nivel de aislamiento estricto (1-3)." }
      },
      "required": ["efhemeralContainerActive", "isolationLockdownLevel"],
      "additionalProperties": false
    },
    "anupadakaProof": {
      "type": "string",
      "description": "Sello de la llama unificada de la última Consagración."
    }
  },
  "required": ["agentTaskId", "executionCommand", "sandboxConfiguration", "anupadakaProof"],
  "additionalProperties": false
}
```

---

## 3. EARS Requirements

- **[REQ-EARS-SND-01] (Event-Driven - Isolated MicroVM Execution)**:  
  **WHEN** `eos.environment.sandbox.execute` is invoked with valid parameters and `efhemeralContainerActive: true`,  
  **THE MCP SERVER SHALL** spawn an isolated ephemeral harness, execute the command, capture standard output/error, and return `status: SANDBOX_EXECUTION_COMPLETED_PRISTINE`.

- **[REQ-EARS-SND-02] (Error-Condition - Isolation Policy Rejection)**:  
  **IF** `efhemeralContainerActive` is false or `isolationLockdownLevel` is outside the range $[1, 3]$,  
  **THE MCP SERVER SHALL** reject execution and return `status: SANDBOX_ISOLATION_REJECTED`.

- **[REQ-EARS-SND-03] (State-Driven - Zero-Waste Memory Obliteration)**:  
  **WHILE** tearing down the ephemeral container,  
  **THE MCP SERVER SHALL** purge volatile memory buffers with `0x00` and generate a SHA-256 execution receipt.

---

## 4. BDD Acceptance Criteria

```gherkin
Feature: MCP Tool #71 — Ephemeral Sandbox Execution Harness
  Scenario: Successfully execute command in ephemeral isolated container
    Given an agentTaskId, valid command, and sandboxConfiguration with lockdown level 3
    When eos.environment.sandbox.execute is invoked
    Then status is SANDBOX_EXECUTION_COMPLETED_PRISTINE
    And exitCode is 0
    And sandboxReceipt begins with sha256-

  Scenario: Reject execution when container is not active or lockdown invalid
    Given an invocation with efhemeralContainerActive set to false
    When eos.environment.sandbox.execute is called
    Then status is SANDBOX_ISOLATION_REJECTED
```
