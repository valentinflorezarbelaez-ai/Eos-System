# Proposal — Mission P: Loop × Worker orchestration (SPEC-0021)

## Why

Missions I–O delivered native Gemini/Stitch/Browser QA compose inside `executeComputeRun`. The MCP Mission Loop (Intent→Spec→Plan→Act→Evidence→Verify→Archive) exists as a fail-closed stage seam, but nothing yet governs **when** compute may run relative to that loop, nor how soft Browser QA / infra failures gate Archive.

## What

1. New module `src/core/orchestration/loop-compute-orchestrator.js` — `runLoopComputeOrchestration`, `advanceLoopOrThrow`, `LOOP_COMPUTE_TOOL_STAGES` (`eos.compute.run` → Act only), `LOOP_COMPUTE_ORCHESTRATOR_PRODUCTION_READY='NO'`.
2. Suite `tests/orchestration/loop-compute-orchestrator.test.js` (≥10 PASS + optional live SKIP); slim-exclude basename; `npm run test:loop-compute` / `test:mission-p`.
3. OpenSpec change + release report.
4. Prefer **not** mutating `mission-loop.js` / worker (orchestrator-local SSOT + imports).

## DoD

Branch `grok/mission-p-loop-worker-orchestration` from main@86d715b7a171ca1998522d6904afe63b7bdf4f1c; tests green (≥10 PASS, 0 FAIL); SLIM≤145; verify:strict EXIT 0 on host.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- PRODUCTION_READY flip
- Fundacion / App Fuerza mutation
- Cursor CloudAgent
- New npm dependencies / JSON schemas
- Raising TR-01 (prefer exclude-from-slim)
- ATS phase writer claims
