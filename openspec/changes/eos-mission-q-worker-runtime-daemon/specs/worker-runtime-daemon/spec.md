# Spec — worker-runtime-daemon (SPEC-0022)

## Requirement: Lifecycle-gated compute accepts

The system SHALL expose an in-process compute worker runtime daemon with states
STOPPED | STARTING | RUNNING | DRAINING | FAILED. `acceptRun` SHALL delegate to
an injected `executeComputeRun` (or `runCompute`) **only** when state is RUNNING;
otherwise it SHALL fail closed with `WORKER_DAEMON_NOT_RUNNING`.

### Scenario: Default STOPPED

- GIVEN a freshly created daemon
- WHEN `acceptRun` is invoked
- THEN it throws `WorkerRuntimeDaemonError` with code `WORKER_DAEMON_NOT_RUNNING`
- AND `health().PRODUCTION_READY` equals `'NO'`

### Scenario: Start then accept

- GIVEN daemon.start() succeeds
- WHEN `acceptRun` is invoked with mock executeComputeRun
- THEN the mock is called and counters runsAccepted/runsCompleted increment
- AND state remains RUNNING

### Scenario: Serial busy fail-closed

- GIVEN maxInFlight=1 and one accept in flight
- WHEN a second concurrent accept is attempted
- THEN it throws with code `WORKER_DAEMON_BUSY`

### Scenario: Drain stop

- GIVEN an in-flight accept
- WHEN `stop({ drain: true })` is called
- THEN state becomes DRAINING (new accepts fail) and then STOPPED after settle

### Scenario: Injected throw resilience

- GIVEN RUNNING daemon whose injected run throws
- WHEN acceptRun rejects
- THEN daemon state remains RUNNING and runsFailed increments

## Requirement: Distinct from AGY daemon

`health().kind` SHALL equal `eos-compute-worker-runtime`. Module docs SHALL
include a NON-CLAIM that this is not agy-daemon / not AGY DAEMON_PRESENT.

## Requirement: PRODUCTION_READY remains NO

`WORKER_RUNTIME_DAEMON_PRODUCTION_READY` SHALL equal `'NO'`.
