# Design — Mission AE (SPEC-0036)

## Architecture

```
createTokenBudgetCircuitBreaker({
  tokenThreshold?|maxTokens?=4096,
  costThreshold?|maxCostUnits?,
  allowReset?=false,          // reset only via HITL confirm or opt-in
  hitlRequiredOnTrip?=true,
  boundedOutputFilter?,       // injectable AA-compatible
  wireBoundedFilter?=true
})
  recordUsage({ tokensIn?, tokensOut?, tokens?, costUnits?, provider?, intent? })
    → ALLOW | trip DENY
  check() / shouldAllow()
  trip(code?) → DENY + receipt
  reset({ confirm? })         // fail-closed unless allowReset or HITL confirm
  health() / getState()
    kind:'eos-token-budget-circuit-breaker', PRODUCTION_READY:'NO'

createEcrBudgetGate → beforeCall / afterCall seam over breaker
createBoundedOutputFilter → thin AA-compatible observe/filterOutbound
```

## Trip semantics

| Condition | Code | HITL |
|-----------|------|------|
| tokensUsed > tokenThreshold | `TOKEN_BUDGET_EXCEEDED` | required |
| costUsed > costThreshold | `COST_BUDGET_EXCEEDED` | required |
| manual `trip()` | `ECR_TRIPPED` | required |
| already tripped | prior code / `ECR_TRIPPED` | required |

Receipt: `{ code, threshold, used, at, PRODUCTION_READY:'NO', hitlRequired }`.
Default fail-closed after trip until explicit reset (HITL / allowReset).

## BoundedOutputFilter

Prefer injectable AA filter when present on host. AE ships a thin compatible
`createBoundedOutputFilter` (observeTokens / filterOutbound / getUsage / reset)
so tests and hosts without swarm still work — no rewrite of AA; no swarm dep.

## Controls

| ID | Control |
|----|---------|
| AE1 | kind + PRODUCTION_READY NO |
| AE2 | under-threshold ALLOW |
| AE3 | trip on token exceed |
| AE4 | DENY after trip |
| AE5 | HITL flag + receipt |
| AE6 | configurable token + cost |
| AE7 | reset denied / HITL confirm |
| AE8 | allowReset opt-in |
| AE9 | BoundedOutputFilter observe |
| AE10 | Law VI + NON-CLAIM |
| AE11 | ecr-budget-gate seam |
| AE12 | manual trip idempotent |
| AE13 | source honesty |
| AE14 | at-threshold ALLOW |
| AE15 | invalid usage |

## Honesty / NON-CLAIM

- ECR ≠ billing platform
- ECR ≠ PRODUCTION_READY
- not AF/AG/AH
- Fundacion Δ=0
- not CloudAgent / not unbounded spend

## Non-goals

No PRODUCTION_READY flip. No CloudAgent. No TR-01 raise. No new npm deps.
No Fundacion touches. No AF loop. No billing rails.
