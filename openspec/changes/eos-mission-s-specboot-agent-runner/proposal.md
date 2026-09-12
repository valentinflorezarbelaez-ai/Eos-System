# Proposal — Mission S: Autonomous SpecBoot Agent Runner (SPEC-0024)

## Why

SpecBoot ceremony (enrich→propose→apply→verify→adversarial-review→archive→commit; HITL publish) is operator-driven via AGY skills / `.cursor/commands`. Missions P+Q delivered governed loop×compute orchestration and a worker-runtime daemon, but operators still lack a **governed runner** that can mechanically walk OpenSpec change apply/verify/evidence/archive bookkeeping against those ports — without inventing a second SpecBoot pipeline, without CloudAgent, and without autonomous main merge.

## What

1. New module `src/core/specboot/specboot-agent-runner.js` — `createSpecbootAgentRunner`, kind `eos-specboot-agent-runner`, phases PROPOSE/APPLY/VERIFY/ARCHIVE/COMMIT_READY, injectable `readChange` / `parseTasks` / `runOrchestration` / `writeEvidence` / `archiveChange` / `hash`, optional Mission Q `bindExecuteComputeRun` wire, `SPECBOOT_AGENT_RUNNER_PRODUCTION_READY='NO'`.
2. Suite `tests/specboot/specboot-agent-runner.test.js` (S1–S12 PASS + optional S13 SKIP); slim-exclude basename; `npm run test:specboot-agent` / `test:mission-s`.
3. OpenSpec change + release report + bootstrap.
4. Prefer **not** mutating `mission-loop.js` / `eos-compute-worker.js` / `loop-compute-orchestrator.js` / `worker-runtime-daemon.js`.

## DoD

Branch `grok/mission-s-specboot-agent-runner` from main@748bffd45b0c7c899595417cd324649bf1732d00 (Mission R merge tip; tip-170 may land later — warn if differs); tests green (≥12 PASS, ≤1 SKIP, 0 FAIL); SLIM≤145; verify:strict EXIT 0 on host.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- PRODUCTION_READY flip
- Fundacion / App Fuerza mutation
- Cursor CloudAgent
- Autonomous main merge / git push from runner
- Replacing AGY skills / `node bin/eos.js` SpecBoot ceremony wholesale
- New npm dependencies / JSON schemas
- Raising TR-01 (prefer exclude-from-slim)
- Rewriting P/Q core modules (prefer)
