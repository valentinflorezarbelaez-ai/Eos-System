# LIVING SPECIFICATION: MCP TOOL #49 (JUSTICE ADJUDICATE)

**Mission ID:** `MIS-MCP-JUS-049`  
**Method Name:** `eos.justice.adjudicate`  
**Status:** `VALIDATED_LOCAL_CANARY`  
**Policy:** `L0_NODE_BUILTINS_ONLY`  
**Target Invariant:** Deterministic Conflict Adjudication and Verdict Proof over MCP Wire

---

## 1. Conscious Purpose
Securely expose the Distributed Justice Oracle to autonomous agents and external clients over the MCP protocol. When concurrent agents propose conflicting states or branches on the same DAG parent, this tool executes 4-tier deterministic adjudication, physically wipes transient memory on the losing node, and mints a cryptographic verdict seal.

---

## 2. Input JSON Schema
```json
{
  "type": "object",
  "properties": {
    "nodeA": {
      "type": "object",
      "properties": {
        "hash": { "type": "string" },
        "envelope": { "type": "object" },
        "cohesionShocks": { "type": "number" },
        "timestamp": { "type": "number" }
      },
      "required": ["hash", "envelope"]
    },
    "nodeB": {
      "type": "object",
      "properties": {
        "hash": { "type": "string" },
        "envelope": { "type": "object" },
        "cohesionShocks": { "type": "number" },
        "timestamp": { "type": "number" }
      },
      "required": ["hash", "envelope"]
    }
  },
  "required": ["nodeA", "nodeB"],
  "additionalProperties": false
}
```

---

## 3. EARS Requirements

- **[REQ-EARS-JUS-MCP-01] (Event-Driven - Strict Schema Validation)**:  
  **WHEN** an agent invokes `eos.justice.adjudicate`,  
  **THE MCP SCHEMA VALIDATOR SHALL** synchronously reject the payload with `SCHEMA_VIOLATION` if either candidate node lacks mandatory fields.

- **[REQ-EARS-JUS-MCP-02] (State-Driven - Deterministic Adjudication & Verdict Proof)**:  
  **WHILE** adjudicating the collision,  
  **THE MCP SERVER SHALL** invoke `DistributedJusticeOracle.adjudicate(nodeA, nodeB)` and return the winning node alongside an immutable SHA-256 verdict proof.

- **[REQ-EARS-JUS-MCP-03] (Error-Condition - Read-Only Enforcement)**:  
  **IF** `EOS_MODE` is configured as `read-only`,  
  **THE MCP SERVER SHALL** permit adjudication with `sideEffects: 'NONE'` as conflict evaluation does not mutate the historical ledger.

---

## 4. BDD Acceptance Criteria

```gherkin
Feature: MCP Tool #49 Justice Adjudicate
  Scenario: Agent submits two conflicting nodes and receives winning verdict
    Given candidate Node A with an invalid seal and candidate Node B with a valid Okidanokh seal
    When the agent calls eos.justice.adjudicate with nodeA and nodeB
    Then the MCP response returns status SUCCESS
    And the winner field contains Node B
    And the response includes a valid SHA-256 verdictHash
```
