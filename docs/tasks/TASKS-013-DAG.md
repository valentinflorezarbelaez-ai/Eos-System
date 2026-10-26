# TASKS-013: Atomic Task DAG — Test Suite Foundation

* **Status:** TASKS_APPROVED
* **Specification:** [SPEC-013](file:///c:/Users/valen/Eos-System-1/docs/specs/SPEC-013-TEST-SUITE-FOUNDATION.md)

---

## Atomic Task Dependency Graph

```text
TASK-013-01 (Install vitest + config)
       │
       ▼
TASK-013-02 (Unit tests: Requirement, EvidenceRecord, OntologyGraph)
       │
       ▼
TASK-013-03 (Unit tests: TaskNode, EARSValidator, AttestationRecord)
       │
       ▼
TASK-013-04 (Unit tests: AgentRoleMatrix, SacredDesignSystem)
       │
       ▼
TASK-013-05 (Unit tests: RagEstimationEngine, DecisionArbiter)
       │
       ▼
TASK-013-06 (package.json scripts + Invariant J + verify)
```

---

## Detailed Task Breakdown

### TASK-013-01: Vitest Configuration
* **Files:** `vitest.config.ts`, `package.json`
* **Done Criteria:** `vitest` and `@vitest/coverage-v8` installed. Config created with ESM + TypeScript support. `test:unit` and `test:coverage` scripts added.

### TASK-013-02: Core Entity Tests (Batch 1)
* **Files:** `tests/unit/domain/Requirement.test.ts`, `EvidenceRecord.test.ts`, `OntologyGraph.test.ts`
* **Done Criteria:** All constructors tested for valid/invalid input. Business logic methods tested with edge cases.

### TASK-013-03: Core Entity Tests (Batch 2)
* **Files:** `tests/unit/domain/TaskNode.test.ts`, `EARSValidator.test.ts`, `AttestationRecord.test.ts`
* **Done Criteria:** DAG readiness, EARS pattern detection, attestation policy verification all tested.

### TASK-013-04: System Model Tests
* **Files:** `tests/unit/domain/AgentRoleMatrix.test.ts`, `SacredDesignSystem.test.ts`
* **Done Criteria:** Role routing, phase mapping, color math, WCAG compliance, golden ratio all tested.

### TASK-013-05: Engine Tests
* **Files:** `tests/unit/domain/RagEstimationEngine.test.ts`, `DecisionArbiter.test.ts`
* **Done Criteria:** PERT math, confidence scoring, consensus calculation, veto logic all tested.

### TASK-013-06: Integration & Verification
* **Action:** Add scripts, run full suite, verify exit code 0.
* **Done Criteria:** `npm run test:unit` → Exit Code 0. All tests pass.
