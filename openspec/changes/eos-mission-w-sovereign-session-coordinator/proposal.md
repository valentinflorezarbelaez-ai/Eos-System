# Proposal — Mission W: Sovereign Session Coordinator (SPEC-0028)

## Why

Missions Q–V delivered worker runtime, FDIR sentinel, SpecBoot agent runner, external write gateway, and FDIR remediation loop as **separable overlays**. Operators still lack a **sovereign session coordinator** that opens a governed session, boots those daemons via injection, dispatches OpenSpec changes through SpecBoot, auto-invokes remediation (≤3) on APPLY/VERIFY failure, drains workers on close, and seals a consolidated EVD custody receipt — without rewriting Q/R/S/T/V, without PRODUCTION_READY pretence, and without Fundacion writes.

## What

1. New module `src/core/session/sovereign-session-coordinator.js` — `createSovereignSessionCoordinator`, kind `eos-sovereign-session-coordinator`, states IDLE → INITIALIZING → SESSION_ACTIVE → CLOSING → SEALED → COMPLETED | ESCALATED_HITL, injectable ports (`workerDaemon`, `sentinel`, `specboot`, `remediation`, `writeGateway`), `SOVEREIGN_SESSION_PRODUCTION_READY='NO'`.
2. Suite `tests/session/sovereign-session-coordinator.test.js` (≥10 cases W1–W14); slim-exclude basename; `npm run test:sovereign-session` / `test:mission-w`.
3. OpenSpec change + release report + bootstrap + package/slim patcher.
4. Prefer **not** mutating Q/R/S/T/V source modules — orchestrate via injection only.

## DoD

Branch `grok/mission-w-sovereign-session-coordinator` from main@d3667cd (warn on mismatch); tests green (≥10 PASS, 0 FAIL); SLIM≤145; verify:strict EXIT 0 on host; no AI commit attribution.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- PRODUCTION_READY flip
- Fundacion / App Fuerza mutation
- Cursor CloudAgent
- agy-daemon install or AGY DAEMON_PRESENT pretence
- New npm dependencies / JSON schemas
- Raising TR-01 (prefer exclude-from-slim)
- Rewriting Mission Q/R/S/T/V modules
- Infinite retry on failure
- Claiming replacement of agy-daemon
