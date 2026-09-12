# Design — Mission AF (SPEC-0037)

## Architecture

```
createAutonomousExecutionLoop({
  llmPort?,          // AD createLlmProviderPort / Fake
  budgetGate?|ecr?,  // AE createEcrBudgetGate / breaker
  session?,          // W minimal: begin/step/end/getState
  shell?,            // X minimal: enqueueIntent | executeCommand
  swarm?,            // AA optional dispatch
  flight?,           // Z optional run/targetFlight
  hitl?,             // { approve(request) } default DENY/false
  enableSwarm?=false,
  enableFlight?=false,
  requireLlm?=true,
  requireBudget?=true
})
  runCycle(intent)
    1. budgetGate.beforeCall / shouldAllow → DENY ECR_TRIPPED|TOKEN_BUDGET_EXCEEDED
    2. HITL if intent.requiresHitl → DENY HITL_REQUIRED
    3. llmPort.complete (fake in tests)
    4. optional swarm/flight behind flags (missing → MISSING_DEP)
    5. budgetGate.afterCall recordUsage
    6. emit receipt / getState
  health() / getState()
    kind:'eos-autonomous-execution-loop', PRODUCTION_READY:'NO'
```

## Fail-closed codes

| Condition | Code |
|-----------|------|
| budget deny / trip | `ECR_TRIPPED` / `TOKEN_BUDGET_EXCEEDED` |
| HITL not approved | `HITL_REQUIRED` |
| missing required dep | `MISSING_DEP` |
| provider fail | `PROVIDER_FAILED` |
| Fundacion write intent | `FUNDACION_DENY` |
| invalid intent | `INVALID_INTENT` |
| swarm/flight/budget anomaly | `ANOMALY` |

## Injection over rewrite

W/X/AA/Z are **optional injectable ports** with minimal interfaces. AF does not
copy their trees. Tests ship inline fakes. On host after AD+AE merge, loop
accepts real `createLlmProviderPort` / `createEcrBudgetGate` instances.

## Controls

| ID | Control |
|----|---------|
| AF1 | kind + PRODUCTION_READY NO |
| AF2 | happy path fake LLM + budget allow |
| AF3 | budget trip DENY (no LLM) |
| AF4 | HITL deny default |
| AF5 | HITL approve path |
| AF6 | missing llmPort |
| AF7 | missing budgetGate |
| AF8 | provider fail |
| AF9 | health / getState / receipt |
| AF10 | Fundacion ALWAYS DENY |
| AF11 | Law VI sanitize |
| AF12 | no network / hermetic |
| AF13 | swarm flag missing dep |
| AF14 | swarm success |
| AF15 | flight + session/shell |
| AF16 | invalid intent + afterCall trip |

## Honesty / NON-CLAIM

- live LLM loop ≠ PRODUCTION_READY
- not AG/AH
- Fundacion Δ=0 / ALWAYS DENY
- not CloudAgent / Antigravity-first
- autonomy ≠ "resuelve cualquier repo"

## Non-goals

No PRODUCTION_READY flip. No CloudAgent. No TR-01 raise. No new npm deps.
No Fundacion touches. No AG tool engine. No live network LLM in CI.
