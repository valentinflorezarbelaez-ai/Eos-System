# EOS Failure Recovery & FDIR Architecture
**Document ID:** `EOS-REC-001`

---

### Stop, Recover, Resume, Rollback Protocol

```mermaid
stateDiagram-v2
    [*] --> NOMINAL
    NOMINAL --> DRIFT_DETECTED: Checksum Mismatch
    DRIFT_DETECTED --> SAFE_MODE: eos.fdir.trip()
    SAFE_MODE --> RESTORING: eos.fdir.recover()
    RESTORING --> NOMINAL: Baselines Restored (Exit Code 0)
    SAFE_MODE --> ROLLBACK: eos.orchestrator.rollback()
    ROLLBACK --> NOMINAL: Previous State Restored
```

- **STOP**: `eos.fdir.trip` trips safe-mode breaker, halting mutating tools.
- **RECOVER**: `eos.fdir.recover` restores `.cursorrules` and `CONSTITUTION.md` from verified SHA-256 baselines.
- **ROLLBACK**: `eos.orchestrator.rollback` reverts FSM state in mission history.
- **RESUME**: `eos.orchestrator.advance` resumes execution after evidence verification.
