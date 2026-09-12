# Design — Mission AT Operator Continuity / Crash-Recovery (SPEC-0051)

## Architecture

Injectable port over an AI-compatible custody store (`load` / `save` /
`putSnapshot` / `listHeads` / `loadLatest`). Live process state is ephemeral;
sealed snapshots live on the injectable store ("disk").

```
checkpoint(session) → sealCustodySnapshot → store.putSnapshot
simulateCrash(session) → clear liveSessions (custody remains)
restart(session) → loadLatest → verify → tip/heads check → restore allowlisted
```

## Fail-closed DENY paths

| Condition | Code |
| --- | --- |
| Snapshot digest mismatch / corruption | `TAMPER_DETECTED` |
| tipPin ≠ expectedTip | `TIP_MISMATCH` |
| >1 custody head without explicit checkpointId | `CUSTODY_CONFLICT` |
| Store injector absent | `MISSING_DEP` |
| Bad / missing sessionId | `INVALID_REQUEST` |
| Secrets flagged for persist into receipt | `SECRET_LEAK_FORBIDDEN` |
| Fundacion write target | `FUNDACION_DENIED` |
| partialApply while recovery / applyPartial | `PARTIAL_APPLY_FORBIDDEN` |

## Allowlisted restore

Only `ALLOWLISTED_SESSION_KEYS` are restored into live state. No Fundacion
mutation. Optional AN envelope adapter wraps/verifies portable custody.

## Explicit non-goals

HA multi-region, multi-AZ product failover, CloudAgent fleet recovery,
AU/AV/AW, PRODUCTION_READY flip, full AI/AN rewrite.
