# TASKS-014: Atomic Task DAG — Semantic Versioning & Changelog Engine

* **Status:** TASKS_APPROVED
* **Specification:** [SPEC-014](file:///c:/Users/valen/Eos-System-1/docs/specs/SPEC-014-SEMANTIC-VERSIONING.md)

---

## Atomic Task Dependency Graph

```text
TASK-014-01 (Domain: SemanticVersion entity)
       │
       ▼
TASK-014-02 (Domain: ConventionalCommitParser entity)
       │
       ▼
TASK-014-03 (Unit Tests: SemanticVersion & ConventionalCommitParser)
       │
       ▼
TASK-014-04 (Application: ReleaseOrchestrator service)
       │
       ▼
TASK-014-05 (Export in src/index.ts & CLI integration in eos-cli.mjs)
       │
       ▼
TASK-014-06 (Verification: vitest coverage 100% + verify:strict exit code 0)
```

---

## Detailed Task Breakdown

### TASK-014-01: SemanticVersion Domain Model
* **File:** `src/core/domain/models/SemanticVersion.ts`
* **Done Criteria:** SemVer 2.0.0 parsing, immutable bumping (major, minor, patch), comparison, string formatting.

### TASK-014-02: ConventionalCommitParser Domain Model
* **File:** `src/core/domain/models/ConventionalCommitParser.ts`
* **Done Criteria:** Parse commit lines into structured objects (type, scope, breaking, subject), detect breaking changes, recommend release level.

### TASK-014-03: Unit Test Suites
* **Files:** `tests/unit/domain/SemanticVersion.test.ts`, `tests/unit/domain/ConventionalCommitParser.test.ts`
* **Done Criteria:** 100% line coverage in Vitest.

### TASK-014-04: ReleaseOrchestrator Application Service
* **File:** `src/core/application/ReleaseOrchestrator.ts`
* **Done Criteria:** Generate formatted markdown changelog, calculate next version, atomic `package.json` updates.

### TASK-014-05: CLI Integration
* **Files:** `src/index.ts`, `scripts/eos-cli.mjs`
* **Done Criteria:** Expose new models and services in library exports and add `release` subcommand to CLI.

### TASK-014-06: Strict Verification & Evidence
* **Action:** Run unit tests, typecheck, build, and `verify:strict`.
* **Done Criteria:** Exit Code 0 across all verification steps.
