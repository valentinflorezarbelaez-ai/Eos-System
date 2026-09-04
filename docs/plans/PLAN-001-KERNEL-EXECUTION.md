# ARCHITECTURAL PLAN: PLAN-001 — KERNEL EXECUTION & SANDBOXING ENGINE

**Document ID:** `PLAN-001-KERNEL-EXECUTION`  
**Mission:** `MIS-001-KERNEL-CORE`  
**Status:** `READY_FOR_EXECUTION`  
**Related Specs:** [`SPEC-001-KERNEL-HARNESS.md`](file:///c:/Users/valen/Documents/Eos%20system/docs/specs/SPEC-001-KERNEL-HARNESS.md)

---

## 1. Architectural Strategy & Design
To satisfy the Zero External Dependency Invariant (`DEPENDENCY_POLICY_L0.md`), the execution engine is decomposed into three strictly decoupled, pure Node.js modules in `src/core/`:

1. **`src/core/sandbox.js` (`EosSandbox`)**:
   - Manages creation and atomic zeroization/destruction of ephemeral workspace directories (`node:fs/promises`, `node:path`, `node:os`).
   - Validates workspace boundaries to block path traversal vulnerabilities (`ERROR_PATH_TRAVERSAL_PREVENTED`).

2. **`src/core/evidence.js` (`EosEvidence`)**:
   - Calculates deterministic SHA-256 hashes of execution artifacts, inputs, and stdout/stderr streams using `node:crypto`.
   - Formats evidence records and associates epistemic classifications (`VERIFIED`, `EXECUTION_FAILED`, `TIMED_OUT`).

3. **`src/core/harness.js` (`EosHarness`)**:
   - Spawns and supervises child processes via `node:child_process.spawn`.
   - Buffers stdout/stderr streams non-blockingly.
   - Enforces timeout budgets with signal escalation (`SIGTERM` -> `SIGKILL`).
   - Delegates sandbox creation to `EosSandbox` and hashing to `EosEvidence`.

---

## 2. Risk Matrix & Mitigations

| Risk ID | Description | Impact | Mitigation Strategy |
| :--- | :--- | :---: | :--- |
| **RSK-01** | Zombie processes on timeout kill failure | High | Implement two-tier signal escalation (`SIGTERM` + `SIGKILL` after grace period). |
| **RSK-02** | Stdout pipe buffer saturation / Deadlock | High | Attach `data` listeners asynchronously without synchronous buffer blocking. |
| **RSK-03** | Path traversal escaping workspace root | Critical | Normalize paths with `path.resolve` and verify `startsWith(authorizedRoot)`. |
