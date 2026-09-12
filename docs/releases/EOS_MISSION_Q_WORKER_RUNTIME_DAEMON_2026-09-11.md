# Mission Q — Worker Runtime Daemon (SPEC-0022) — 2026-09-11

## Summary

Long-lived in-process lifecycle wrapper around `executeComputeRun` so Mission P
Loop×Worker orchestration can talk to a **RUNNING** compute runtime
(start/stop/status/acceptRun), fail-closed when stopped, with serial
`maxInFlight=1` and drain semantics. New module
`src/core/compute/worker-runtime-daemon.js` — **not** agy-daemon / **not**
eos-workstation.

## Routing

| Signal | Path |
| --- | --- |
| Lifecycle | `createWorkerRuntimeDaemon` → start/stop/status/health/acceptRun |
| Compute | Injected `executeComputeRun` / `runCompute` (lazy worker import optional) |
| Mission P wire | `createLoopComputeAdapter` / `bindExecuteComputeRun` |
| AGY T7/U5 | **NON-CLAIM** — remains honest DAEMON_ABSENT; kind=`eos-compute-worker-runtime` |
| ATS | Non-claim |

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/compute/worker-runtime-daemon.js` | **NEW** |
| `tests/compute/worker-runtime-daemon.test.js` | **NEW** |
| `scripts/runners/eos-compute-worker.js` | **No** |
| `src/core/mcp/mission-loop.js` | **No** |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude |
| OpenSpec + release | **Yes** |

## Verification (box harness)

```
cd /workspace/mission-q/harness && node --test tests/compute/worker-runtime-daemon.test.js
```

→ **11 PASS**, 1 SKIP, 0 FAIL

Slim exclude `worker-runtime-daemon.test.js` + `npm run test:worker-daemon` / `test:mission-q`.

## Cases

| ID | Result |
| --- | --- |
| Q1 PRODUCTION_READY=NO + STOPPED default | PASS |
| Q2 start/status RUNNING | PASS |
| Q3 acceptRun happy path delegates | PASS |
| Q4 acceptRun STOPPED → NOT_RUNNING | PASS |
| Q5 busy/serial maxInFlight=1 → BUSY | PASS |
| Q6 stop → reject accepts | PASS |
| Q7 drain semantics | PASS |
| Q8 injected throw keeps RUNNING + runsFailed | PASS |
| Q9 health.kind = eos-compute-worker-runtime | PASS |
| Q10 NON-CLAIM / no AGY PRESENT pretence | PASS |
| Q11 createLoopComputeAdapter wires acceptRun | PASS |
| Q12 Optional live | SKIP |

## Governance

- PRODUCTION_READY=NO | Fundacion Δ=0 | AT_CEILING | Antigravity-first | zero new npm deps
- SLIM ≤145 via exclude-from-slim (no TR-01 raise)
- Base tip Expected: `04f4b2d1ca30e995eb6ebdd8846ee862c454abfe`
- **NON-CLAIM vs AGY T7:** this daemon ≠ agy-daemon; does not install or claim DAEMON_PRESENT

## Branch

`grok/mission-q-worker-runtime-daemon`
