# Spec — sovereign-session-coordinator (SPEC-0028)

## Requirement: Sovereign session lifecycle

The system SHALL expose a governed sovereign session coordinator with states
IDLE | INITIALIZING | SESSION_ACTIVE | CLOSING | SEALED | COMPLETED |
ESCALATED_HITL. `openSession` SHALL boot injected workerDaemon and sentinel
(when present) and transition to SESSION_ACTIVE. `runChange` SHALL dispatch
via SpecBoot. `closeSession`/`seal` SHALL drain workers with `{drain:true}`,
seal a consolidated EVD custody receipt (SHA-256), and reach COMPLETED
(or remain ESCALATED_HITL after sealing if already escalated).

### Scenario: Happy path open→run→seal→COMPLETED

- GIVEN injected worker, sentinel, specboot, and remediation ports
- WHEN openSession → runChange(ok) → closeSession
- THEN status is COMPLETED, sealedEvd.sha256 is 64-hex, PRODUCTION_READY='NO'
- AND kind equals `eos-sovereign-session-coordinator`

### Scenario: INITIALIZING boots worker+sentinel

- GIVEN workerDaemon.start and sentinel.start injected
- WHEN openSession completes
- THEN both start were called and stateLog includes INITIALIZING then SESSION_ACTIVE

### Scenario: Missing critical ports fail-closed

- GIVEN createSovereignSessionCoordinator without workerDaemon
- WHEN openSession is invoked
- THEN result is ESCALATED_HITL with hitlRequired=true (fail-closed)

## Requirement: SpecBoot failure → remediation ≤3 → HITL

On SpecBoot APPLY or VERIFY failure, the coordinator SHALL invoke the injected
remediation port (maxAttempts ≤3, default 3). If remediation resolves, the
session SHALL remain SESSION_ACTIVE. If remediation is exhausted or missing,
state SHALL become ESCALATED_HITL (no infinite retry).

### Scenario: APPLY fail then remediation resolves

- GIVEN specboot fails APPLY once and remediation returns RESOLVED
- WHEN runChange completes
- THEN status is REMEDIATED and state remains SESSION_ACTIVE

### Scenario: Remediation exhaust → HITL

- GIVEN specboot always fails and remediation always escalates
- WHEN runChange completes
- THEN status is ESCALATED_HITL and hitlRequired=true

## Requirement: Drain + EVD custody seal

CLOSING SHALL call `workerDaemon.stop({drain:true})` when present. SEALED SHALL
emit an EVD with `sha256`/`bodySha256` (64-hex) and `custody.algorithm='sha256'`.

### Scenario: Drain worker with drain:true

- GIVEN an active session
- WHEN closeSession runs
- THEN worker.stop was called with `{drain:true}`

### Scenario: SEALED custody receipt

- GIVEN a completed happy-path session
- WHEN seal/close finishes
- THEN getSealedEvd().sha256 matches /^[a-f0-9]{64}$/ and custody.digest equals sha256

## Requirement: Write gateway deny/rollback + sentinel quarantine

When `externalWrite` is present on a change, the coordinator SHALL use
writeGateway authorize/write and invoke rollback on write failure. When
sentinel.tick reports quarantine during a session, the coordinator SHALL
escalate to ESCALATED_HITL.

## Requirement: PRODUCTION_READY remains NO

`SOVEREIGN_SESSION_PRODUCTION_READY` SHALL equal `'NO'`. Health SHALL never
claim CloudAgent path or AGY DAEMON_PRESENT. Fundacion Δ SHALL remain 0.
