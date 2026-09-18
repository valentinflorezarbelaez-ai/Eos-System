# Design — Mission CC Mission Economics & Portfolio Budget Governor Port

## Architecture

```
plan { portfolioId?, envelope{latencyMsBudget,costUnitsBudget,riskScoreBudget}, allocations[{missionId,latencyMs,costUnits,riskScore}] }
        │
        ▼
MissionPortfolioBudgetPolicyGate.evaluatePlan
        │ deny → CC-RCPT decision=DENY
        ▼
totals = Σ allocations
        │
        ▼
decideBudget → ALLOW | THROTTLE | DENY
        │
        ▼
rootDigest = sha256({portfolioId, envelope, allocations, totals, decision, reasons})
        │
        ▼
CC-RCPT-* nine-field seal + store by portfolioId
```

## Nine-field seal

`receiptId, operation, portfolioId, decision, rootDigest, allocationCount, timestamp, fundacionDelta, prevReceiptHash`

## Decision rules

- Hard: any total > budget → DENY (`OVER_BUDGET_DENY`)
- Soft: under hard caps but any util ≥ `CC_THROTTLE_RATIO` (0.85) → THROTTLE
- Else ALLOW

## Isolation doctrine

Pure `node:crypto`. No network. No cloud billing APIs. Do not mutate `token-economics-audit-engine.js`.
