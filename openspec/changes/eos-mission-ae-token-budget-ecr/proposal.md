# Proposal — Mission AE: Token-Budget Circuit Breaker / ECR (SPEC-0036)

## Why

Ladder 14 audit ranks **Token-Budget Circuit Breaker / ECR** as the second L14
satellite (after AD). AA BoundedOutputFilter observes `TOKEN_BUDGET_EXCEEDED`
inside swarm, but there is no **enforceable budget gate** on the execution-loop
seam that trips fail-closed and escalates HITL before runaway cost.

## What

1. `src/core/budget/token-budget-circuit-breaker.js` — `createTokenBudgetCircuitBreaker`
   / `createECR`; kind `eos-token-budget-circuit-breaker`; configurable token and/or
   cost thresholds; `recordUsage` / `check` / `trip` / `reset` / `health` /
   `getState` / `shouldAllow`; trip → DENY `TOKEN_BUDGET_EXCEEDED` / `ECR_TRIPPED`
   with `hitlRequired:true` + receipt; optional injectable BoundedOutputFilter;
   thin self-contained AA-compatible filter; Law VI; `ECR_PRODUCTION_READY='NO'`.
2. `src/core/budget/ecr-budget-gate.js` — thin `beforeCall` / `afterCall` seam
   (not AF loop).
3. Suite `tests/eos-ae-token-budget-ecr.test.js` (AE1–AE15); slim-exclude;
   `npm run test:token-budget-ecr` / `test:mission-ae`.
4. OpenSpec change + release report + bootstrap + idempotent patcher.

## DoD

Branch `grok/mission-ae-token-budget-ecr` from main tip starting with `90e89da`
(StartsWith; Mission AD #197 merge — tip-197 may land after; bootstrap continues
with actual origin/main); tests green (~12–16 PASS, 0 FAIL); SLIM≤145;
verify:strict EXIT 0 on host; PRODUCTION_READY=NO; Fundacion Δ=0; no AI commit
attribution; no CloudAgent; zero new npm deps.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- AF autonomous execution loop / AG tool engine / AH L14 closeout
- PRODUCTION_READY flip
- Real Fundacion writes
- Billing platform / payment rails
- Claiming ECR ≡ PRODUCTION_READY or unbounded spend
- CloudAgent
