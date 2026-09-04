# LIVING SPECIFICATION: MISSION ONTOLOGY EXPLAINABILITY GRAPH (DAG)

**Mission ID:** `MIS-ONT-GRA-001`  
**Status:** `VALIDATED_LOCAL_CANARY`  
**Policy:** `L0_NODE_BUILTINS_ONLY`  
**Authority gate:** Human PO approval required.

---

## 1. EARS Requirements

- **[REQ-EARS-GRA-01] (Event-Driven - Alternatives Sub-Graph Generation)**:  
  **WHEN** a decision block is compiled via `EOSMissionOntologyCore`,  
  **THE SYSTEM SHALL** transform the `optionsConsidered` into a deterministic sub-graph of alternatives, mapping each discarded route to its logical weight and status (`SELECTED` or `DISCARDED`).

- **[REQ-EARS-GRA-02] (Ubiquitous - Cryptographic Transparency Seal)**:  
  **THE SYSTEM SHALL** compute and embed the stable SHA-256 hash of this alternatives sub-graph (`transparencyGraphHash`) inside the main `missionChainHash`, guaranteeing that the rationale behind rejecting options is cryptographically immutable and tamper-proof.

---

## 2. BDD Acceptance Criteria

```gherkin
Feature: Mission Ontology Explainability Graph
  Scenario: Decision compilation builds deterministic alternatives graph
    Given an ontology core instance and previous mission state
    When compileDecisionBlock is executed with multiple optionsConsidered
    Then the decision block embeds a valid transparencyGraphHash
    And contains structured graphNodes reflecting SELECTED and DISCARDED alternatives
    And is verified as well-formed by isWellFormedChain
```
