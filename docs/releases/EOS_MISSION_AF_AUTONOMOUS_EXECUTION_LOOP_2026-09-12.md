# Mission AF — Autonomous Execution Loop (SPEC-0037) — 2026-09-12

## Summary

Hermetic **Autonomous Execution Loop** that wires injectable ports — AD
`llmPort`, AE `budgetGate`/`ecr`, optional W session / X shell / AA swarm /
Z flight — behind HITL (default DENY) and **Fundacion ALWAYS DENY**. Single
`runCycle(intent)` path: budget gate → HITL → LLM complete (fake in tests) →
optional swarm/flight → budget afterCall → sealed receipt. Fail-closed on
missing deps, budget trip, HITL deny, provider fail, Fundacion write intents.
Law VI secret sanitization. Additive under `src/core/loop/` — **does not**
implement AG/AH, **does not** flip PRODUCTION_READY, **does not** use
CloudAgent, **does not** rewrite W/X/AA/Z wholesale, **does not** call live
network LLM in CI.

## Tip / branch pins

| Pin | Value |
| --- | --- |
| Expected base tip (StartsWith) | `4786826` (post #198/#199 clean main) |
| Branch | `grok/mission-af-autonomous-execution-loop` |
| Worktree | `C:\Users\valen\Documents\Eos-mission-af` |
| Payload | `C:\Users\valen\Documents\Eos-mission-af-payload` |

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — ALWAYS DENY; no Fundacion paths touched |
| PRODUCTION_READY | **`NO`** (never YES) |
| Live LLM loop | **NON-CLAIM** — live LLM loop ≠ PRODUCTION_READY |
| AG / AH | **NOT implemented** in this mission |
| CloudAgent | **NON-CLAIM** — Antigravity-first |
| Autonomy | **NON-CLAIM** — ≠ "resuelve cualquier repo" |
| Secrets in repo | **FORBIDDEN** — Law VI sanitize |
| Live network LLM in CI | **FORBIDDEN** — fake providers only in tests |

## Routing

| Signal | Path |
| --- | --- |
| Loop | `createAutonomousExecutionLoop` |
| Cycle | budget → HITL → llmPort.complete → optional swarm/flight → afterCall → receipt |
| Fail-closed codes | `ECR_TRIPPED`, `TOKEN_BUDGET_EXCEEDED`, `HITL_REQUIRED`, `MISSING_DEP`, `PROVIDER_FAILED`, `FUNDACION_DENY` |
| Law VI | `sanitizeAfPayload` — redact apiKey/token/authorization |
| AGY / CloudAgent | **NON-CLAIM** |

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/loop/autonomous-execution-loop.js` | **NEW** |
| `tests/eos-af-autonomous-execution-loop.test.js` | **NEW** |
| `scripts/patch-mission-af.mjs` | **NEW** |
| Real Documents/Fundacion | **No** |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude via patcher |
| OpenSpec + release + bootstrap | **Yes** |
| AG / AH modules | **No** |

## Verification (box harness)

```
cd /workspace/Eos-mission-af-payload && npm run test:mission-af
```

→ **16 PASS**, 0 SKIP, 0 FAIL (AF1–AF16)

Slim exclude basename: `eos-af-autonomous-execution-loop.test.js`  
Scripts: `npm run test:autonomous-execution-loop` / `npm run test:mission-af`

## Cases

| ID | Result |
| --- | --- |
| AF1 kind + PRODUCTION_READY NO | PASS |
| AF2 happy path fake LLM + budget allow | PASS |
| AF3 budget trip DENY (no LLM) | PASS |
| AF4 HITL deny default | PASS |
| AF5 HITL approve path | PASS |
| AF6 missing llmPort | PASS |
| AF7 missing budgetGate | PASS |
| AF8 provider fail | PASS |
| AF9 health / getState / receipt | PASS |
| AF10 Fundacion ALWAYS DENY | PASS |
| AF11 Law VI sanitize | PASS |
| AF12 no network / hermetic | PASS |
| AF13 swarm flag missing dep | PASS |
| AF14 swarm success | PASS |
| AF15 flight + session/shell | PASS |
| AF16 invalid intent + afterCall trip | PASS |

## Secrets hygiene

- No `sk-…` live secrets in source (tests use ephemeral synthetic strings only
  in memory assertions; redaction verified).
- Receipts / getState never dump credentials.
- Fundacion write intents always DENY.
