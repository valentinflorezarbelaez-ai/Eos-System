# Proposal — Mission R: Governed FDIR Sentinel Runtime (SPEC-0023)

## Why

N6/V4 delivered construct-only `EOSSentinelDaemon` + FDIR ontology orphan purge signals, but operators still lack a **governed overlay** that can drive a hermetic watch cycle (baseline SHA-256 check → orphan detect → fail-closed quarantine) without pulling the full live daemon graph (drift/memory-guard) into unit tests — and without pretending PRODUCTION_READY or AGY DAEMON_PRESENT.

Naming conflict: `EOSSentinelDaemon` already lives at `src/core/sentinel-daemon.js`. Mission R therefore adds a **new** overlay class/factory — not a second `EOSSentinelDaemon`.

## What

1. New module `src/core/fdir/fdir-sentinel-runtime.js` — `createFdirSentinelRuntime` / internal `FdirSentinelRuntime`, kind `eos-fdir-sentinel-runtime`, states STOPPED/STARTING/RUNNING/DRAINING/FAILED/QUARANTINED, codes ORPHAN_LINK_DETECTED / UNAUDITED_MUTATION_QUARANTINED / BASELINE_HASH_MISMATCH / SENTINEL_NOT_RUNNING / SENTINEL_BUSY, injectable `hashFile` / `detectOrphans` / `quarantine`, optional `bindExistingSentinelDaemon`, `FDIR_SENTINEL_RUNTIME_PRODUCTION_READY='NO'`.
2. Suite `tests/fdir/fdir-sentinel-runtime.test.js` (R1–R11 PASS + optional R12 SKIP); slim-exclude basename; `npm run test:fdir-sentinel` / `test:mission-r`.
3. OpenSpec change + release report + bootstrap.
4. Prefer **not** mutating `sentinel-daemon.js` / `fdir.js` / `fdir-ontology.js` / `eos-compute-worker.js` / `mission-loop.js`.

## DoD

Branch `grok/mission-r-fdir-sentinel-runtime` from main@2713ab2be195c6b6969e6ccff5ccd2b089786e37; tests green (≥11 PASS, ≤1 SKIP, 0 FAIL); SLIM≤145; verify:strict EXIT 0 on host.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- PRODUCTION_READY flip
- Fundacion / App Fuerza mutation
- Cursor CloudAgent
- agy-daemon install or AGY DAEMON_PRESENT pretence
- New npm dependencies / JSON schemas
- Raising TR-01 (prefer exclude-from-slim)
- Rewriting sentinel-daemon.js / fdir.js / fdir-ontology.js (prefer)
- Claiming V4/N6 incomplete
