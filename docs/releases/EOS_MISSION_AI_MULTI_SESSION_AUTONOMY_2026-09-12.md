# Mission AI — Multi-Session Autonomy Coordinator (SPEC-0040) — 2026-09-12

## Summary

Hermetic **Multi-Session Autonomy Coordinator** — durable create / suspend /
resume across AF cycle horizons with custody snapshots, generation counters,
and fail-closed drift detection (`SESSION_DRIFT`). Injectable store port +
optional AF `runCycle` loop. Law VI deep-redacts secrets from getState /
receipts (runtime synth only — no static vendor-key literals). HITL default
deny when `requireHitl`. Additive under `src/core/session/` — **does not**
implement AJ/AK/AL/AM, **does not** flip PRODUCTION_READY, **does not** use
CloudAgent, **does not** open live network in CI, **does not** claim unbounded
autonomy products.

## Tip / branch pins

| Pin | Value |
| --- | --- |
| Expected base tip (StartsWith) | `99944f4` (`99944f41cef5d3870159b826886286b42a601adf`) |
| Branch | `grok/mission-ai-multi-session-autonomy-coordinator` |
| Worktree | `C:\Users\valen\Documents\Eos-mission-ai` |
| Payload | `C:\Users\valen\Documents\Eos-mission-ai-payload` |

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — ALWAYS DENY; no Fundacion paths touched |
| PRODUCTION_READY | **`NO`** (never YES) |
| Multi-session | **NON-CLAIM** — ≠ PRODUCTION_READY ≠ unbounded autonomy product / agent fleet |
| AJ/AK/AL/AM | **NOT implemented** in this mission |
| CloudAgent | **NON-CLAIM** — Antigravity-first |
| Secrets in repo | **FORBIDDEN** — Law VI; runtime synth only (AF11 lesson) |
| Live network in CI | **FORBIDDEN** — hermetic fakes only |

## Routing

| Signal | Path |
| --- | --- |
| Factory | `createMultiSessionAutonomyCoordinator` |
| Lifecycle | `createSession` / `suspendSession` / `resumeSession` / `getSession` / `listSessions` |
| Optional cycle | `runCycle(sessionId, intent)` via injectable AF loop |
| Fail-closed codes | `UNKNOWN_SESSION`, `SESSION_DRIFT`, `INVALID_STATE`, `HITL_REQUIRED`, `MISSING_DEP`, `FUNDACION_DENY` |
| Law VI | `sanitizeAiPayload` — redact apiKey/token/authorization/secret/password |
| Receipt | custody receipt on create/suspend/resume/runCycle; `PRODUCTION_READY:'NO'` |
| Store | durable in-memory default + injectable `{ load, save, list }` |
| AGY / CloudAgent | **NON-CLAIM** |

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/session/multi-session-autonomy-coordinator.js` | **NEW** |
| `src/core/session/session-custody-store.js` | **NEW** |
| `tests/eos-ai-multi-session-autonomy.test.js` | **NEW** |
| `scripts/patch-mission-ai.mjs` | **NEW** |
| Real Documents/Fundacion | **No** |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude via patcher |
| OpenSpec + release + bootstrap | **Yes** |
| AJ/AK/AL/AM modules | **No** |

## Verification (box harness)

```
cd /workspace/Eos-mission-ai-payload && npm run test:mission-ai
```

→ **16 PASS**, 0 SKIP, 0 FAIL (AI1–AI16)

Slim exclude basename: `eos-ai-multi-session-autonomy.test.js`  
Scripts: `npm run test:multi-session-autonomy` / `npm run test:mission-ai`

## Cases

| ID | Result |
| --- | --- |
| AI1 kind + PRODUCTION_READY NO | PASS |
| AI2 create + list | PASS |
| AI3 suspend/resume no drift | PASS |
| AI4 drift DENY SESSION_DRIFT | PASS |
| AI5 unknown session | PASS |
| AI6 suspend twice / resume active fail-closed | PASS |
| AI7 Law VI redact (runtime synth) | PASS |
| AI8 custody receipts | PASS |
| AI9 HITL requireHitl default deny | PASS |
| AI10 injectable store persistence | PASS |
| AI11 runCycle fake loop / MISSING_DEP | PASS |
| AI12 Fundacion ALWAYS DENY | PASS |
| AI13 hermetic no network / no CloudAgent | PASS |
| AI14 no static vendor-key literals | PASS |
| AI15 custody-store chain + digest tamper | PASS |
| AI16 getState metrics + resumeActiveIdempotent | PASS |

## NON-CLAIM (permanent)

**multi-session ≠ PRODUCTION_READY**; **multi-session ≠ unbounded autonomy product**.
Fundacion Δ=0. CloudAgent out. Do not implement AJ/AK/AL/AM in this branch.
