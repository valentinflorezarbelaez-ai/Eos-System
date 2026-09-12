# Spec — fdir-remediation-loop (SPEC-0027)

## Requirement: Bounded diagnose→remediate→verify loop

The system SHALL expose a governed FDIR remediation loop with states
IDLE | RUNNING | DIAGNOSING | REMEDIATING | REVERIFYING | RESOLVED |
ESCALATED_HITL. `run(failureContext)` SHALL execute diagnose → remediate →
verify cycles up to `maxAttempts` (clamped ≥1, default 3). When verification
succeeds, state SHALL become RESOLVED. When attempts are exhausted without
success, state SHALL become ESCALATED_HITL and the loop SHALL return a
fail-closed result (no uncontrolled throw storm, no infinite retry).

### Scenario: Nominal resolve attempt 1

- GIVEN injected ports that diagnose, remediate, and verify ok on first attempt
- WHEN `run` is invoked
- THEN status is RESOLVED, attempts=1, PRODUCTION_READY='NO'
- AND kind equals `eos-fdir-remediation-loop`

### Scenario: Recover on attempt 2

- GIVEN verify fails on attempt 1 and succeeds on attempt 2
- WHEN `run` completes
- THEN status is RESOLVED and attempts=2

### Scenario: Exhaust budget → HITL escalate

- GIVEN verify always fails and maxAttempts=3
- WHEN `run` completes
- THEN status is ESCALATED_HITL, hitlRequired=true, attempts=3
- AND a receipt with code REMEDIATION_ESCALATED_HITL is present

### Scenario: Missing ports fail-closed

- GIVEN createFdirRemediationLoop without diagnose/remediate/verify
- WHEN `run` is invoked
- THEN it throws FdirRemediationLoopError with code REMEDIATION_DEPENDENCY

## Requirement: Optional sentinel quarantine gate

When an optional `sentinel.checkRemediation` denies a remediation plan, the
loop SHALL quarantine (if `sentinel.quarantine` present), seal a
REMEDIATION_SENTINEL_QUARANTINE receipt, skip verify for that attempt, and
continue or escalate per budget.

### Scenario: Sentinel quarantine

- GIVEN sentinel.checkRemediation returns quarantine/unauthorized
- WHEN run executes with maxAttempts=2
- THEN quarantine is called per attempt, verify is not called, status ESCALATED_HITL

## Requirement: Audit receipts with SHA-256

Each attempt cycle SHALL seal an audit receipt with `sha256` / `bodySha256`
(64-hex SHA-256 of receipt body), kind `eos-fdir-remediation-loop`, and
PRODUCTION_READY='NO' — compatible with sealEvd / SpecBoot hashing style.

## Requirement: PRODUCTION_READY remains NO

`FDIR_REMEDIATION_LOOP_PRODUCTION_READY` SHALL equal `'NO'`. Health SHALL never
claim CloudAgent path or AGY DAEMON_PRESENT.
