# TASKS-015: Atomic Task DAG — Runtime Configuration & Environment Management

* **Status:** TASKS_APPROVED
* **Specification:** [SPEC-015](file:///c:/Users/valen/Eos-System-1/docs/specs/SPEC-015-RUNTIME-CONFIG.md)

---

## Atomic Task Dependency Graph

```text
TASK-015-01 (Domain: EnvironmentConfig entity)
       │
       ▼
TASK-015-02 (Unit Tests: EnvironmentConfig domain model)
       │
       ▼
TASK-015-03 (Infrastructure: ConfigLoader adapter)
       │
       ▼
TASK-015-04 (Configuration Profiles: .eos/config/default.json, dev.json, prod.json)
       │
       ▼
TASK-015-05 (CLI Integration: eos config show/validate)
       │
       ▼
TASK-015-06 (Strict Verification & Evidence Update)
```

---

## Detailed Task Breakdown

### TASK-015-01: EnvironmentConfig Domain Model
* **File:** `src/core/domain/models/EnvironmentConfig.ts`
* **Done Criteria:** Profile types, variable expansion, secret scanning, immutability.

### TASK-015-02: Unit Tests
* **File:** `tests/unit/domain/EnvironmentConfig.test.ts`
* **Done Criteria:** 100% line coverage in Vitest.

### TASK-015-03: ConfigLoader Adapter
* **File:** `src/infrastructure/ConfigLoader.ts`
* **Done Criteria:** Recursive merge of profile files with default, environment substitution.

### TASK-015-04: Config Profile Files
* **Files:** `.eos/config/default.json`, `.eos/config/development.json`, `.eos/config/production.json`
* **Done Criteria:** Well-formed, valid configuration schemas.

### TASK-015-05: CLI Integration
* **Files:** `scripts/eos-cli.mjs`, `src/index.ts`
* **Done Criteria:** `eos config show`, `eos config validate` commands.

### TASK-015-06: Strict Verification
* **Action:** Run unit tests, typecheck, build, and `verify:strict`.
* **Done Criteria:** Exit Code 0 across all verification steps.
