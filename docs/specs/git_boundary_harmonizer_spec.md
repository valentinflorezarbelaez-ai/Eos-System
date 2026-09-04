# LIVING SPECIFICATION: CANONICAL GIT BOUNDARY HARMONIZER

**Mission ID:** `MIS-GIT-BND-002`  
**Status:** `VALIDATED_LOCAL_CANARY`  
**Policy:** `L0_NODE_BUILTINS_ONLY`  
**Target Invariant:** Zero Untracked Core Files (Absolute Baseline Reproducibility)

---

## 1. EARS Requirements

- **[REQ-EARS-BND-01] (Ubiquitous - Configuration Ingestion)**:  
  **WHEN** the Git Boundary Harmonizer script executes,  
  **THE SYSTEM SHALL** read the canonical schema `docs/design/p0/EOS_CANONICAL_GIT_BOUNDARY.json` to load the exact whitelist of required files and folders.

- **[REQ-EARS-BND-02] (Event-Driven - Status Audit)**:  
  **WHEN** auditing the workspace status,  
  **THE SYSTEM SHALL** invoke the local native Git plumbing interface (`git status --porcelain`) to detect untracked or dirty modifications.

- **[REQ-EARS-BND-03] (Error-Condition - Boundary Breach Abort)**:  
  **IF** any file outside the authorized canonical paths attempts to pollute the production worktree,  
  **THE SYSTEM SHALL** immediately fail the validation gate, abort the deployment pipeline, and trigger an explicit `GIT_BOUNDARY_VIOLATION`.

- **[REQ-EARS-BND-04] (Ubiquitous - Deterministic Glob Whitelist Matching)**:  
  **THE SYSTEM SHALL** support glob pattern matching (`*` and `**/`) within `EOS_CANONICAL_GIT_BOUNDARY.json` to allow clean, recursive directory whitelisting for mandatory modules and documentation layouts.

---

## 2. BDD Acceptance Criteria

```gherkin
Feature: Canonical Git Boundary Harmonizer
  Scenario: Immaculate worktree passes boundary verification
    Given an operational workspace where all untracked files match canonical release whitelists
    When the boundary harmonizer audits the git porcelain status
    Then the system returns VERIFIED with exit code 0
    And permits the canary deployment pipeline to continue

  Scenario: Unregistered orphan files trigger boundary violation
    Given an untracked file outside the canonical boundary whitelist
    When the boundary harmonizer audits the git porcelain status
    Then the validation gate fails with GIT_BOUNDARY_VIOLATION
    And the pipeline halts immediately with exit code 1
```
