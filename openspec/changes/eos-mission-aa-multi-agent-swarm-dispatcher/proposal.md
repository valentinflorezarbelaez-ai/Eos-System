# Proposal — Mission AA: Multi-Agent Swarm Dispatcher (SPEC-0032)

## Why

Ladder 13 audit names SPEC-0032 after Mission Z: a single coordinator/session (W) and single-operator REPL (X) leave a gap for **capped multi-persona dispatch** with an audited AgentHandoffEnvelope (who → whom, custody, limits). Enterprise blueprint: Architect → Builder → Verifier via envelope; **BUILDER != VERIFIER**.

## What

1. `src/core/swarm/agent-handoff-validator.js` — AgentHandoffEnvelope V3 fail-closed validator; role aliases PLANNER→ARCHITECT, CODER→BUILDER, QA→VERIFIER; typed `AgentHandoffValidationError`.
2. `src/core/swarm/multi-agent-dispatcher.js` — `createMultiAgentDispatcher` kind `eos-multi-agent-swarm-dispatcher`; injectable architect/planner, builder/coder, verifier/qa; BUILDER!=VERIFIER; verify-fail retry with `maxRounds` (default 2, clamp ≥1); BoundedOutputFilter (TOKEN_BUDGET_EXCEEDED); `maxConcurrent` default 1 capped at 3; hash-chained receipts; `DISPATCHER_PRODUCTION_READY='NO'`.
3. Suite `tests/eos-aa-multi-agent-swarm.test.js` (AA1–AA16); slim-exclude basename; `npm run test:multi-agent-swarm` / `test:mission-aa`.
4. OpenSpec change + release report + bootstrap + idempotent patcher.

## DoD

Branch `grok/mission-aa-multi-agent-swarm-dispatcher` from main tip starting with `8604014` (Mission Z on main; bootstrap may accept tip post-#188); tests green (≥12 PASS, 0 FAIL); SLIM≤145; verify:strict EXIT 0 on host; PRODUCTION_READY=NO; Fundacion Δ=0; no AI commit attribution; no CloudAgent.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- CloudAgent fleet / unbounded swarm
- PRODUCTION_READY flip
- Real Fundacion writes
- New npm dependencies
- Claiming dispatcher ≡ production multi-agent autonomy
