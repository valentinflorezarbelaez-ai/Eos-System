# Spec — fdir-sentinel-runtime (SPEC-0023)

## Requirement: Lifecycle-gated watch ticks

The system SHALL expose a governed FDIR sentinel runtime with states
STOPPED | STARTING | RUNNING | DRAINING | FAILED | QUARANTINED. `tick` SHALL
run a watch cycle **only** when state is RUNNING; otherwise it SHALL fail
closed with `SENTINEL_NOT_RUNNING`. Concurrent ticks beyond `maxInFlightTicks`
SHALL fail with `SENTINEL_BUSY`.

### Scenario: Default STOPPED

- GIVEN a freshly created runtime
- WHEN `tick` is invoked
- THEN it throws `FdirSentinelRuntimeError` with code `SENTINEL_NOT_RUNNING`
- AND `health().PRODUCTION_READY` equals `'NO'`

### Scenario: Start then nominal tick

- GIVEN runtime.start() succeeds and baselines match via injected `hashFile`
- WHEN `tick` is invoked with empty orphans
- THEN ticks increments, mismatches/orphans/quarantines remain 0
- AND state remains RUNNING
- AND `health().kind` equals `eos-fdir-sentinel-runtime`

### Scenario: Baseline mismatch fail-closed quarantine

- GIVEN a baseline whose `hashFile` result differs from expected sha256
- WHEN `tick` runs
- THEN injected `quarantine(pathKey, BASELINE_HASH_MISMATCH)` is called
- AND events include `BASELINE_HASH_MISMATCH` then `UNAUDITED_MUTATION_QUARANTINED`
- AND by default state remains RUNNING with quarantines incremented
- AND when `haltOnQuarantine:true`, state becomes QUARANTINED and further ticks throw

### Scenario: Orphan isolation signal

- GIVEN `detectOrphans` returns one or more orphans
- WHEN `tick` runs
- THEN each orphan emits `ORPHAN_LINK_DETECTED` (purge not required)

### Scenario: Serial busy fail-closed

- GIVEN maxInFlightTicks=1 and one tick in flight
- WHEN a second concurrent tick is attempted
- THEN it throws with code `SENTINEL_BUSY`

## Requirement: Distinct from AGY and live sentinel daemon

`health().kind` SHALL equal `eos-fdir-sentinel-runtime`. Module docs SHALL
include a NON-CLAIM that this is not agy-daemon, not eos-compute-worker-runtime,
and not a claim of AGY DAEMON_PRESENT. N6 construct-only lock on
`sentinel-daemon.js` / `fdir.js` / `fdir-ontology.js` SHALL remain unchanged.

## Requirement: PRODUCTION_READY remains NO

`FDIR_SENTINEL_RUNTIME_PRODUCTION_READY` SHALL equal `'NO'`.
