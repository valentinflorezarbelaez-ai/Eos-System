# Design — Mission Q (SPEC-0022)

## Architecture

```
createWorkerRuntimeDaemon({ executeComputeRun | runCompute, maxInFlight=1 })
  default state STOPPED
  start() → RUNNING
  acceptRun(...args)
    if state !== RUNNING → WORKER_DAEMON_NOT_RUNNING
    if inFlight >= maxInFlight → WORKER_DAEMON_BUSY
    else delegate to injected executeComputeRun; counters++
  stop() → STOPPED (reject new accepts)
  stop({ drain:true }) while in-flight → DRAINING → STOPPED after settle
  injected throw → stays RUNNING; runsFailed++; does not crash daemon
  health/status → { state, PRODUCTION_READY:'NO', kind:'eos-compute-worker-runtime', ... }
  createLoopComputeAdapter() → { executeComputeRun: daemon.acceptRun }
  bindExecuteComputeRun(daemon) → (...a) => daemon.acceptRun(...a)
```

## Controls

| ID | Control |
|----|---------|
| Q1 | PRODUCTION_READY=NO + STOPPED default; accept fails NOT_RUNNING |
| Q2 | start → RUNNING; health.PRODUCTION_READY NO |
| Q3 | acceptRun delegates + counters |
| Q4 | STOPPED accept → WORKER_DAEMON_NOT_RUNNING |
| Q5 | maxInFlight=1 → WORKER_DAEMON_BUSY |
| Q6 | stop → reject accepts |
| Q7 | drain semantics DRAINING→STOPPED |
| Q8 | injected throw keeps RUNNING + runsFailed |
| Q9 | health.kind = eos-compute-worker-runtime (≠ agy) |
| Q10 | NON-CLAIM / no AGY PRESENT pretence |
| Q11 | createLoopComputeAdapter / bindExecuteComputeRun |
| Q12 | Optional live SKIP |

## Honesty vs AGY T7/U5

This daemon's `kind` is `eos-compute-worker-runtime`. Evidence/docs MUST say it is **not** `agy-daemon` and MUST NOT claim AGY `DAEMON_PRESENT`. T7/U5 AGY workstation lock remains honest `DAEMON_ABSENT` unless a separate corroborated agy-daemon install exists.

## Non-goals

No PRODUCTION_READY flip. No Fundacion writes. No CloudAgent. No worker.js / mission-loop.js mutation. No new npm deps.
