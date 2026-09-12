# Design — Mission R (SPEC-0023)

## Architecture

```
createFdirSentinelRuntime({
  baselines, hashFile, detectOrphans, quarantine,
  purgeOrphan?, onEvent?, maxInFlightTicks=1,
  haltOnQuarantine=false, scheduler?
})
  default state STOPPED
  start(baselines?) → RUNNING  (no timer unless scheduler injected)
  tick()
    if state !== RUNNING (and not mid-QUARANTINED block) → SENTINEL_NOT_RUNNING
    if inFlight >= maxInFlightTicks → SENTINEL_BUSY
    for each baseline key:
      hashFile(key); if mismatch → quarantine(key, BASELINE_HASH_MISMATCH)
        emit BASELINE_HASH_MISMATCH + UNAUDITED_MUTATION_QUARANTINED
        remain RUNNING + quarantines++  OR  haltOnQuarantine → QUARANTINED
    detectOrphans() → emit ORPHAN_LINK_DETECTED per orphan (purge optional)
  stop({drain?}) → STOPPED (DRAINING if drain + in-flight)
  health/status → { state, kind:'eos-fdir-sentinel-runtime', PRODUCTION_READY:'NO', ticks, mismatches, orphansDetected, quarantines, startedAt }
  bindExistingSentinelDaemon(eosSentinelDaemon) → thin adapter (optional; tests use ports)
```

## Quarantine policy (chosen)

**Remain RUNNING** after quarantine applied + events recorded; `quarantines++`.
Optional `haltOnQuarantine:true` → state `QUARANTINED` and further ticks throw `SENTINEL_NOT_RUNNING`.

## Controls

| ID | Control |
|----|---------|
| R1 | PRODUCTION_READY=NO + STOPPED default |
| R2 | start → RUNNING + kind |
| R3 | tick nominal (match, no orphans) |
| R4 | mismatch → quarantine + BASELINE_HASH_MISMATCH + UNAUDITED_MUTATION_QUARANTINED |
| R5 | orphan → ORPHAN_LINK_DETECTED |
| R6 | tick STOPPED → SENTINEL_NOT_RUNNING |
| R7 | concurrent tick → SENTINEL_BUSY |
| R8 | stop → reject ticks |
| R9 | haltOnQuarantine → QUARANTINED blocks ticks |
| R10 | health never claims AGY PRESENT / PRODUCTION_READY yes |
| R11 | events ledger append-only order |
| R12 | Optional live soak SKIP |

## Honesty

- ≠ agy-daemon / AGY DAEMON_PRESENT
- ≠ eos-compute-worker-runtime (Mission Q)
- ≠ rewriting live `EOSSentinelDaemon` (N6 construct-only lock unchanged)
- PRODUCTION_READY remains `'NO'`

## Non-goals

No PRODUCTION_READY flip. No Fundacion writes. No CloudAgent. No sentinel-daemon.js / fdir.js rewrite. No new npm deps. No TR-01 raise.
