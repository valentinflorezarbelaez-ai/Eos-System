# TASKS-001: ATOMIC TASK DIRECTED ACYCLIC GRAPH (DAG)
## Execution Plan for EOS Core 2.0 Baseline Implementation

---

```text
[TASK-01: Directory Setup]
         |
         v
[TASK-02: Domain Entities] --------> [TASK-03: Domain Invariants & Value Objects]
         |                                           |
         +-------------------+-----------------------+
                             |
                             v
                [TASK-04: Application Services]
                             |
                             v
             [TASK-05: Infrastructure Adapters]
                             |
                             v
             [TASK-06: Sentinel & FDIR Engine]
                             |
                             v
            [TASK-07: Strict Verification Suite]
                             |
                             v
            [TASK-08: Cryptographic Evidence Log]
```

---

### Task Ledger
| Task ID | Description | Dependencies | Done Criteria | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TASK-01** | Create project directories and config files (`package.json`, `tsconfig.json`) | None | Files exist on disk with valid syntax | `DONE` |
| **TASK-02** | Implement pure Domain Entities (`Requirement`, `EvidenceRecord`, `TaskNode`, `OntologyNode`) | TASK-01 | Domain classes defined with 0 external I/O | `DONE` |
| **TASK-03** | Implement pure Domain Invariants & Validators (`EARSValidator`) | TASK-02 | EARS syntax parser passes unit tests | `DONE` |
| **TASK-04** | Implement Application Services (`DualTrackOrchestrator`, `EvidenceRecorder`) | TASK-03 | Fast/Heavy track classification verified | `DONE` |
| **TASK-05** | Implement Infrastructure Adapters (Crypto hasher, File System) | TASK-04 | SHA-256 signatures match system hashes | `DONE` |
| **TASK-06** | Implement `EOSSentinelDaemon` and `EOSFDIROntology` self-healing engine | TASK-05 | Orphan links pruned and reported | `DONE` |
| **TASK-07** | Write & execute native strict verification suite (`scripts/verify-strict.ps1`) | TASK-06 | Exit code 0, 100% tests passing | `DONE` |
| **TASK-08** | Generate certified evidence artifact (`docs/evidence/EVD-0001-BASELINE-STRICT-PASS.json`) | TASK-07 | Signed JSON artifact written to disk | `DONE` |
