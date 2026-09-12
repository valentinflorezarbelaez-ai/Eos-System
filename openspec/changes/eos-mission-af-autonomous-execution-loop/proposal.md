# Proposal — Mission AF: Autonomous Execution Loop (SPEC-0037)

## Why

Ladder 14 audit ranks **Autonomous Execution Loop** as the third L14 satellite
(after AD provider port and AE budget ECR). X shell + W session + AA swarm + Z
flight live as satellites; there is no **hermetic orchestration loop** that
wires them behind an injectable LLM provider + AE budget gate + HITL
fail-closed defaults.

## What

1. `src/core/loop/autonomous-execution-loop.js` — `createAutonomousExecutionLoop`;
   kind `eos-autonomous-execution-loop`; injectable `llmPort` / `budgetGate|ecr` /
   `session` / `shell` / `swarm` / `flight` / `hitl` (default DENY); `runCycle`
   order: budget → HITL → LLM → optional swarm/flight → afterCall → receipt;
   `health` / `getState`; Law VI sanitize; Fundacion ALWAYS DENY;
   `AF_PRODUCTION_READY='NO'`.
2. Suite `tests/eos-af-autonomous-execution-loop.test.js` (AF1–AF16) with inline
   fakes (no AD/AE required on box); slim-exclude;
   `npm run test:autonomous-execution-loop` / `test:mission-af`.
3. OpenSpec change + release report + bootstrap + idempotent patcher.

## DoD

Branch `grok/mission-af-autonomous-execution-loop` from main tip starting with
`4786826` (StartsWith; post #198/#199 clean main); tests green (~12–16 PASS,
0 FAIL); SLIM≤145; verify:strict EXIT 0 on host; PRODUCTION_READY=NO;
Fundacion Δ=0; no AI commit attribution; no CloudAgent; zero new npm deps;
do NOT implement AG/AH.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- AG Live Tool Engine / AH L14 closeout
- PRODUCTION_READY flip
- Real Fundacion writes
- Live network LLM in CI (fake providers only in tests)
- Rewriting W/X/AA/Z wholesale (inject ports)
- Claiming live LLM loop ≡ PRODUCTION_READY or unbounded autonomy
- CloudAgent
