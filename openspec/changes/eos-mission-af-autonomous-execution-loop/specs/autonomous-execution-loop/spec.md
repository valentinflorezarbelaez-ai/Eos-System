# Spec — Autonomous Execution Loop (SPEC-0037 / Mission AF)

## Purpose

Provide a hermetic, fail-closed **autonomous execution loop** that orchestrates
injectable LLM (AD), budget (AE), optional session/shell/swarm/flight ports,
and HITL — without rewriting satellite trees or enabling live network LLM in CI.

## Requirements

### R1 — Factory & kind
- `createAutonomousExecutionLoop(options)` returns object with
  `kind: 'eos-autonomous-execution-loop'` and `PRODUCTION_READY: 'NO'`.

### R2 — Injected deps (optional; fail-closed stubs when required)
- `llmPort`, `budgetGate`/`ecr`, `session`, `shell`, `swarm`, `flight`, `hitl`.
- Default HITL `approve` returns false (DENY).
- Missing required dep for a step → `MISSING_DEP`.

### R3 — `runCycle(intent)` order
1. Budget `beforeCall` / `shouldAllow` — deny → `ECR_TRIPPED` / `TOKEN_BUDGET_EXCEEDED`.
2. HITL when `intent.requiresHitl` (or policy) — deny → `HITL_REQUIRED`.
3. `llmPort.complete` (fake in tests).
4. Optional swarm/flight behind `enableSwarm` / `enableFlight`.
5. Budget `afterCall` recordUsage.
6. Emit receipt; expose via `getState`.

### R4 — Fundacion
- ANY Fundacion write intent → `FUNDACION_DENY`.
- Receipts always carry `fundacion: 'ALWAYS_DENY'`, `fundacionDelta: 0`.

### R5 — Honesty
- Law VI sanitize on dumps/errors/receipts.
- No network LLM in default CI path.
- NON-CLAIM: live LLM loop ≠ PRODUCTION_READY; not AG/AH; Fundacion Δ=0.

### R6 — Tests
- Hermetic suite ≥12 PASS with inline fakes; slim-excluded basename
  `eos-af-autonomous-execution-loop.test.js`.

## Non-requirements
- AG Live Tool Engine, AH closeout, PRODUCTION_READY flip, CloudAgent,
  real Fundacion writes, wholesale W/X/AA/Z rewrite.
