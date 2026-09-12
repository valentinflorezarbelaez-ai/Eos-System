# Proposal — Mission Q: Worker Runtime Daemon (SPEC-0022)

## Why

Mission P delivered Loop×Worker orchestration that invokes `executeComputeRun` at Act. Operators still lack a **long-lived in-process lifecycle** around that compute entrypoint (start/stop/status/acceptRun) so the orchestrator can talk to a RUNNING runtime and fail-closed when stopped — without pretending to be AGY `agy-daemon` / eos-workstation.

## What

1. New module `src/core/compute/worker-runtime-daemon.js` — `createWorkerRuntimeDaemon`, states STOPPED/STARTING/RUNNING/DRAINING/FAILED, `acceptRun` gated on RUNNING, serial `maxInFlight=1`, `WORKER_RUNTIME_DAEMON_PRODUCTION_READY='NO'`, `health.kind='eos-compute-worker-runtime'`, optional `createLoopComputeAdapter` / `bindExecuteComputeRun`.
2. Suite `tests/compute/worker-runtime-daemon.test.js` (Q1–Q11 PASS + optional Q12 SKIP); slim-exclude basename; `npm run test:worker-daemon` / `test:mission-q`.
3. OpenSpec change + release report.
4. Prefer **not** mutating `eos-compute-worker.js` / `mission-loop.js`.

## DoD

Branch `grok/mission-q-worker-runtime-daemon` from main@04f4b2d1ca30e995eb6ebdd8846ee862c454abfe; tests green (≥11 PASS, ≤1 SKIP, 0 FAIL); SLIM≤145; verify:strict EXIT 0 on host.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- PRODUCTION_READY flip
- Fundacion / App Fuerza mutation
- Cursor CloudAgent
- agy-daemon install or AGY DAEMON_PRESENT pretence (T7/U5 stay honest DAEMON_ABSENT)
- New npm dependencies / JSON schemas
- Raising TR-01 (prefer exclude-from-slim)
- Mutating eos-compute-worker.js (prefer) / mission-loop.js
