# LIVING SPECIFICATION: CONTEXT COMPILER WITH CRYPTOGRAPHIC PROVENANCE & SECRET LEAK PREVENTION

**Mission ID:** `MIS-CTX-COMP-002`  
**Status:** `VALIDATED_LOCAL_CANARY`  
**Policy:** `L0_NODE_BUILTINS_ONLY`  
**Authority gate:** Human PO approval required.

---

## 1. EARS Requirements

- **[REQ-EARS-CTX-01] (Event-Driven - Provenance Hashing)**:  
  **WHEN** the context compiler processes a list of source file paths,  
  **THE SYSTEM SHALL** read each file synchronously and compute its stable SHA-256 checksum.

- **[REQ-EARS-CTX-02] (State-Driven - Budget Boundary Enforcement)**:  
  **WHEN** compiling the final context payload,  
  **THE SYSTEM SHALL** enforce a hard character budget limit (`maxCharBudget`). If the combined character count exceeds this limit, **THE SYSTEM SHALL** redact or truncate content safely and append a `CONTEXT_TRUNCATED` metadata flag.

- **[REQ-EARS-CTX-03] (Ubiquitous - Provenance Receipt Output)**:  
  **WHEN** compilation completes,  
  **THE SYSTEM SHALL** output a standardized payload structure containing the flattened prompt text and a map of files to their immutable hashes, signed as a `provenanceReceipt`.

- **[REQ-EARS-CTX-04] (Event-Driven - Buffer Secret Scanning)**:  
  **WHEN** the context compiler reads a source file,  
  **THE SYSTEM SHALL** scan its buffer using static regular expressions to detect leaked credentials (such as OpenAI keys, Google AI keys, or generic Bearer tokens).

- **[REQ-EARS-CTX-05] (Error-Condition - Secret Leak Intercept)**:  
  **IF** a secret or restricted credential pattern is identified within any input file,  
  **THE SYSTEM SHALL** immediately abort the execution flow, refuse prompt compilation, and throw a fatal security fault (`SECURITY_BREACH_SECRETS_EXPOSED`).

---

## 2. BDD Acceptance Criteria

```gherkin
Feature: Context Compiler with Cryptographic Provenance & Secret Leak Prevention
  Scenario: Clean files produce exact provenance hashes within budget
    Given clean local text files without active credentials
    When the context compiler aggregates them within the character budget
    Then the final prompt contains both file contents cleanly delimited
    And the provenance receipt maps both files to their exact SHA-256 hashes

  Scenario: Intercepted secrets abort compilation immediately
    Given a source file containing an active OpenAI or Google API key
    When the context compiler audits the file buffer
    Then prompt compilation is refused
    And a fatal SECURITY_BREACH_SECRETS_EXPOSED exception is thrown
```
