# Proposal — Mission V: Autonomous FDIR Remediation Loop (SPEC-0027)

## Why

Mission R delivered a governed FDIR **sentinel** watch/quarantine overlay. Operators still lack a **remediation loop** that consumes a failure context, runs diagnose → remediate → verify with a bounded attempt budget, seals SHA-256 audit receipts each cycle, optionally defers to the Mission R sentinel for unauthorized-mutation quarantine, and fail-closed escalates to HITL when attempts are exhausted — without infinite retry, without PRODUCTION_READY pretence, and without Fundacion writes.

## What

1. New module `src/core/fdir/fdir-remediation-loop.js` — `createFdirRemediationLoop`, kind `eos-fdir-remediation-loop`, states IDLE → RUNNING → DIAGNOSING → REMEDIATING → REVERIFYING → RESOLVED | ESCALATED_HITL, injectable `diagnose` / `remediate` / `verify`, optional `sentinel` gate, `FDIR_REMEDIATION_LOOP_PRODUCTION_READY='NO'`.
2. Suite `tests/fdir/fdir-remediation-loop.test.js` (≥10 cases V1–V13); slim-exclude basename; `npm run test:fdir-remediation` / `test:mission-v`.
3. OpenSpec change + release report + bootstrap + package/slim patcher.
4. Prefer **not** mutating `fdir-sentinel-runtime.js` / `sentinel-daemon.js` / `fdir.js` / `fdir-ontology.js`.

## DoD

Branch `grok/mission-v-fdir-remediation-loop` from main@24c9845 (warn on mismatch); tests green (≥10 PASS, 0 FAIL); SLIM≤145; verify:strict EXIT 0 on host; no AI commit attribution.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- PRODUCTION_READY flip
- Fundacion / App Fuerza mutation
- Cursor CloudAgent
- agy-daemon install or AGY DAEMON_PRESENT pretence
- New npm dependencies / JSON schemas
- Raising TR-01 (prefer exclude-from-slim)
- Rewriting Mission R sentinel or live FDIR surfaces (prefer)
- Infinite retry on failure
