# LIVING SPECIFICATION: RUNTIME L0 ISOLATED PACKAGING

**Mission ID:** `MIS-PKG-RNT-001`  
**Status:** `VALIDATED_LOCAL_CANARY`  
**Policy:** `L0_NODE_BUILTINS_ONLY`  
**Authority gate:** Human PO approval required before execution of distribution exports.

---

## 1. EARS Requirements

- **[REQ-EARS-PKG-01] (Event-Driven - Isolated Worktree Creation)**:  
  **WHEN** the isolated packaging script is executed,  
  **THE SYSTEM SHALL** create a clean, dedicated worktree directory (`dist/runtime-core`) completely isolated from the monorepo test files and logs.

- **[REQ-EARS-PKG-02] (State-Driven - L0 Pure Manifest Injection)**:  
  **WHEN** the distribution package is compiled,  
  **THE SYSTEM SHALL** inject a strict, independent manifest (`package.json`) enforcing `type: "module"` and ensuring `dependencies` remain empty (`NODE_BUILTINS_ONLY`).

- **[REQ-EARS-PKG-03] (Error-Condition - Contamination Prevention)**:  
  **IF** any non-core file or legacy harness leaks into the target directory,  
  **THE SYSTEM SHALL** fail the packaging task and refuse the generation of the canary tarball release.

---

## 2. BDD Acceptance Criteria

```gherkin
Feature: Runtime L0 Isolated Packaging
  Scenario: Extracting clean runtime produces isolated distribution package
    Given verified core runtime components in src/core/runtime/
    When the packager script builds dist/runtime-core/
    Then the target directory contains exactly the canonical L0 modules and manifest
    And dependencies in dist/runtime-core/package.json are empty
    And the package can be imported standalone
```
