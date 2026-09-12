# Spec — Operator Continuity / Crash-Recovery Custody Port (SPEC-0051)

## ADDED Requirements

### Requirement: Continuity restart after crash
WHEN a governed session process crashes with sealed custody on disk, THE SYSTEM SHALL offer a continuity restart that restores allowlisted session state without mutating Fundacion.

#### Scenario: Checkpoint → crash → restart
- GIVEN a checkpointed session with sealed custody on the injectable store
- WHEN the process crashes (live state cleared) and `restart` is invoked
- THEN the system returns `RESTART_OK` with sealed receipt and restored allowlisted state

### Requirement: Tamper / tip / conflict DENY
IF continuity restart detects tamper, tip mismatch, or conflicting custody heads, THE SYSTEM SHALL DENY restart and emit a sealed receipt.

#### Scenario: Tamper DENY
- GIVEN sealed custody that has been mutated after seal
- WHEN `restart` is invoked
- THEN the system returns `TAMPER_DETECTED` with forensic sealed receipt and does not restore live state

#### Scenario: Tip mismatch DENY
- GIVEN sealed custody whose `tipPin` differs from expected tip
- WHEN `restart` is invoked
- THEN the system returns `TIP_MISMATCH` with sealed receipt

#### Scenario: Conflicting heads DENY
- GIVEN multiple custody heads for the same session without an explicit checkpointId
- WHEN `restart` is invoked
- THEN the system returns `CUSTODY_CONFLICT` with sealed receipt

### Requirement: Fail-closed during recovery
WHILE continuity recovery is in progress, THE SYSTEM SHALL remain fail-closed (no partial apply; no silent HA multi-region claim).

#### Scenario: Partial apply forbidden
- GIVEN recovery in progress or `partialApply: true`
- WHEN restart / applyPartial is attempted
- THEN the system returns `PARTIAL_APPLY_FORBIDDEN`

### Requirement: Production honesty
THE SYSTEM SHALL set `AT_PRODUCTION_READY='NO'` and MUST NOT claim HA multi-region SaaS, multi-AZ failover product, or CloudAgent fleet recovery.
