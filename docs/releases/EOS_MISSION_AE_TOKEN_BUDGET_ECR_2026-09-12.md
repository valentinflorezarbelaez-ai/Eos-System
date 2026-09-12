# Mission AE — Token-Budget Circuit Breaker / ECR (SPEC-0036) — 2026-09-12

## Summary

Fail-closed **Token-Budget Circuit Breaker (ECR)** for the execution-loop
seam. Configurable token and/or estimated-cost thresholds; trip → DENY with
`TOKEN_BUDGET_EXCEEDED` / `ECR_TRIPPED`, `hitlRequired: true`, and a sealed
receipt. Optional injectable **BoundedOutputFilter** (AA-compatible observe
semantics) plus a thin self-contained filter so AE does not depend on full
swarm. Reset only via explicit opt-in / HITL confirm (default fail-closed
after trip). Law VI secret sanitization on dumps/errors/receipts. Additive
under `src/core/budget/` — **does not** implement AF/AG/AH, **does not** flip
PRODUCTION_READY, **does not** use CloudAgent, **does not** ship a billing
platform.

## Tip / branch pins

| Pin | Value |
| --- | --- |
| Expected base tip (StartsWith) | `90e89da` (Mission AD #197 merge; tip-197 may land after) |
| Branch | `grok/mission-ae-token-budget-ecr` |
| Worktree | `C:\Users\valen\Documents\Eos-mission-ae` |
| Payload | `C:\Users\valen\Documents\Eos-mission-ae-payload` |

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — no Fundacion paths touched |
| PRODUCTION_READY | **`NO`** (never YES) |
| ECR | **NON-CLAIM** — ECR ≠ billing platform ≠ PRODUCTION_READY |
| AF / AG / AH | **NOT implemented** in this mission |
| CloudAgent | **NON-CLAIM** — Antigravity-first |
| Unbounded spend | **FORBIDDEN** — trip fail-closed + HITL |
| Secrets in repo | **FORBIDDEN** — Law VI sanitize |

## Routing

| Signal | Path |
| --- | --- |
| Breaker | `createTokenBudgetCircuitBreaker` / `createECR` |
| Gate seam | `createEcrBudgetGate` → beforeCall / afterCall |
| Filter | `createBoundedOutputFilter` (AA-compatible) or injectable |
| Fail-closed codes | `TOKEN_BUDGET_EXCEEDED`, `COST_BUDGET_EXCEEDED`, `ECR_TRIPPED`, `RESET_DENIED` |
| Law VI | `sanitizeEcrPayload` — redact apiKey/token/authorization |
| AGY / CloudAgent | **NON-CLAIM** |

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/budget/token-budget-circuit-breaker.js` | **NEW** |
| `src/core/budget/ecr-budget-gate.js` | **NEW** |
| `tests/eos-ae-token-budget-ecr.test.js` | **NEW** |
| `scripts/patch-mission-ae.mjs` | **NEW** |
| Real Documents/Fundacion | **No** |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude via patcher |
| OpenSpec + release + bootstrap | **Yes** |

## Verification (box harness)

```
cd /workspace/Eos-mission-ae-payload && npm run test:token-budget-ecr
```

→ **15 PASS**, 0 SKIP, 0 FAIL (AE1–AE15)

Slim exclude basename: `eos-ae-token-budget-ecr.test.js`  
Scripts: `npm run test:token-budget-ecr` / `npm run test:mission-ae`

## Cases

| ID | Result |
| --- | --- |
| AE1 kind + PRODUCTION_READY NO | PASS |
| AE2 under-threshold ALLOW | PASS |
| AE3 trip on token exceed | PASS |
| AE4 DENY after trip | PASS |
| AE5 HITL flag + receipt | PASS |
| AE6 configurable token + cost | PASS |
| AE7 reset denied / HITL confirm | PASS |
| AE8 allowReset opt-in | PASS |
| AE9 BoundedOutputFilter observe | PASS |
| AE10 Law VI + NON-CLAIM | PASS |
| AE11 ecr-budget-gate seam | PASS |
| AE12 manual trip idempotent | PASS |
| AE13 source honesty | PASS |
| AE14 at-threshold ALLOW | PASS |
| AE15 invalid usage | PASS |

## Secrets hygiene

- No `sk-…` live secrets in source (tests use ephemeral synthetic strings only
  in memory assertions; redaction verified).
- Receipts / getState never dump credentials.
