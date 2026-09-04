# LIVING SPECIFICATION: PURGATORIAL CORE REFINEMENT & FULL MCP WHITELISTS

**Mission ID:** `MIS-PURGE-CORE-004`  
**Status:** `VALIDATED_LOCAL_CANARY`  
**Policy:** `L0_NODE_BUILTINS_ONLY`  
**Authority gate:** Human PO approval required.

---

## 1. EARS Requirements

- **[REQ-EARS-PRG-01] (Event-Driven - Direct Context Compiler Binding)**:  
  **WHEN** a transition occurs in the `EOSMissionOrchestrator`,  
  **THE SYSTEM SHALL** invoke the context compiler directly during the `INTAKE` step and verify the data footprint before allowing any file mutation on disk.

- **[REQ-EARS-PRG-02] (Error-Condition - Strict Parameter Schema Defense)**:  
  **WHEN** any tools are queried or executed via the JSON-RPC interface,  
  **THE SYSTEM SHALL** reject the call immediately if the arguments block contains extraneous fields not explicitly defined in the strict tool schemas (`additionalProperties: false`).

- **[REQ-EARS-PRG-03] (Event-Driven - MCP Dispatcher Schema Audit)**:  
  **WHEN** an external JSON-RPC 2.0 tool execution call enters `src/mcp-server.js`,  
  **THE SYSTEM SHALL** synchronously invoke the `EOSMCPSchemaValidator` before executing the target handler.

- **[REQ-EARS-PRG-04] (Error-Condition - Schema Breach Rejection)**:  
  **IF** the validator identifies a parameter schema breach or missing required arguments,  
  **THE SYSTEM SHALL** immediately abort processing and return a structured JSON-RPC error mapping to `SECURITY_BREACH_SCHEMA_VIOLATION` or `VALIDATION_FAULT`.

- **[REQ-EARS-PRG-07] (Ubiquitous - Universal 42-Tool Catalog Whitelisting)**:  
  **THE SYSTEM SHALL** expand the `EOSMCPSchemaValidator` dictionary to index 100% of the 42 active canonical tools in the server deployment, supporting both snake_case (`eos_x`) and dot.notation (`eos.x`) mappings.

- **[REQ-EARS-PRG-08] (State-Driven - Universal Perimeter Fuzzing Insulation)**:  
  **THE SYSTEM SHALL** evaluate every incoming JSON-RPC arguments block against strict type bindings, enforcing `additionalProperties: false` universally to completely insulate the environment from parameter fuzzing or side-channel injections.

---

## 2. BDD Acceptance Criteria

```gherkin
Feature: Full MCP Whitelists & Universal Perimeter Defense
  Scenario: Incoming tool execution is strictly validated across all 42 tools
    Given a JSON-RPC request targeting any of the 42 canonical tools
    When the parameters match the exact whitelist schema
    Then the validator approves the payload execution

  Scenario: Extraneous parameters are universally blocked with additionalProperties: false
    Given an incoming request containing an undocumented parameter
    When the validator audits the payload
    Then the execution is aborted with SECURITY_BREACH_SCHEMA_VIOLATION

  Scenario: Unregistered tools are rejected by default
    Given a request targeting an unindexed tool name
    When the validator checks the whitelist catalog
    Then the call fails closed throwing a whitelist absence fault
```
