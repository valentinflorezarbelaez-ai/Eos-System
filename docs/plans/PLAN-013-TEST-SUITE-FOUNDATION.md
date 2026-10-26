# PLAN-013: Test Suite Foundation — Architecture Plan

* **Status:** PLAN_APPROVED
* **Specification:** [SPEC-013](file:///c:/Users/valen/Eos-System-1/docs/specs/SPEC-013-TEST-SUITE-FOUNDATION.md)

---

## Architecture Decision Record

### ADR-013-01: Test Runner Selection

**Context:** EOS needs a unit test runner that supports ESM, TypeScript, and fast execution.

**Decision:** Use `vitest` with `@vitest/coverage-v8`.

**Rejected Alternatives:**
| Alternative | Rejection Rationale |
|:---|:---|
| `jest` | Requires additional ESM configuration, slower startup, heavier dependency tree |
| `node:test` | Built-in but lacks TypeScript transform, coverage integration is immature |
| `mocha + chai` | Requires separate assertion library and coverage plugin; more configuration overhead |

**Consequences:**
- Near-zero config for ESM + TypeScript
- Sub-second test startup
- Native coverage via V8 engine (no Istanbul overhead)

### ADR-013-02: Test Structure

**Decision:** Mirror source directory structure under `tests/unit/`.

```text
tests/
  unit/
    domain/
      Requirement.test.ts
      EvidenceRecord.test.ts
      OntologyGraph.test.ts
      TaskNode.test.ts
      EARSValidator.test.ts
      AttestationRecord.test.ts
      AgentRoleMatrix.test.ts
      SacredDesignSystem.test.ts
      RagEstimationEngine.test.ts
      DecisionArbiter.test.ts
```

**Rationale:** 1:1 source-to-test mapping enables instant file navigation and enforces complete coverage discipline.
