# Mission AO — Provider Failover & Resilience Router (SPEC-0046) — 2026-09-12

## Summary

Hermetic **Provider Failover & Resilience Router** — injectable router over
AD LLM Provider Port + AE ECR patterns: ordered provider candidates,
health/deny probes, budget-aware failover under remaining ECR budget,
fail-closed exhaust → DENY + sealed receipt (no silent unbounded retry).
Hermetic fakes only. Law VI: secrets env-only; never persist provider
secrets into EVD bodies or federation envelopes (runtime synth only —
no static vendor-key literals). Additive under `src/core/llm/` — **does
not** implement AP/AQ/AR, **does not** flip PRODUCTION_READY, **does not**
use CloudAgent, **does not** claim PRODUCTION_READY LLM ops / SLA product /
multi-cloud billing.

## Tip / branch pins

| Pin | Value |
| --- | --- |
| Expected base tip (StartsWith) | `b741e12` (`b741e128ef371fc599b7b92ce5b40cf6193ff7bf`) |
| Branch | `grok/mission-ao-provider-failover-resilience-router` |
| Worktree | `C:\Users\valen\Documents\Eos-mission-ao` |
| Payload | `C:\Users\valen\Documents\Eos-mission-ao-payload` |
| Ladder 16 | AN MEASURED; **AO this mission**; AP/AQ/AR not this mission |

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — ALWAYS DENY; no Fundacion paths touched |
| PRODUCTION_READY | **`NO`** (never YES) |
| Provider failover | **NON-CLAIM** — ≠ PRODUCTION_READY LLM ops ≠ SLA product ≠ multi-cloud billing |
| AP/AQ/AR | **NOT implemented** in this mission |
| CloudAgent | **NON-CLAIM** — Antigravity-first |
| Secrets in repo | **FORBIDDEN** — Law VI; runtime synth only (AF11 lesson) |
| Unbounded retry | **FORBIDDEN** — exhaust → DENY + receipt |

## Routing

| Signal | Path |
| --- | --- |
| Factory | `createProviderFailoverResilienceRouter` |
| Route / invoke | `route(request)` / `invoke(request)` — ordered providers under ECR |
| Probe / order | `probeActive()` / `setOrder(ids)` |
| Active / list | `getActiveProviderId()` / `listProviders()` |
| Seal | `sealReceipt(...)` |
| Fail-closed codes | `PROVIDER_PROBE_FAIL`, `ECR_DENY`, `FAILOVER_EXHAUSTED`, `MISSING_DEP`, `INVALID_REQUEST`, `SECRET_LEAK_FORBIDDEN`, `HITL_REQUIRED` |
| Law VI | `sanitizeAoPayload` — redact apiKey/token/authorization/secret/password; runtime vendor-prefix synth |
| ECR | injectable `{ canSpend, record, remaining }` (AE-like stub `createMemoryEcrMeter`) |
| Probe helper | `provider-health-probe.js` / `probeProvider` |
| AGY / CloudAgent | **NON-CLAIM** |

## EARS

- WHEN active provider probe fails or ECR denies further spend on active provider → attempt next allowlisted provider under remaining AE ECR budget
- IF all allowlisted providers exhausted or ECR ceiling hit → DENY further LLM calls + seal receipt (no silent unbounded retry)
- WHILE routing across providers → never persist provider secrets into EVD bodies or federation envelopes (Law VI)

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/llm/provider-failover-resilience-router.js` | **NEW** |
| `src/core/llm/provider-health-probe.js` | **NEW** |
| `tests/eos-ao-provider-failover-resilience.test.js` | **NEW** |
| `scripts/patch-mission-ao.mjs` | **NEW** |
| Real Documents/Fundacion | **No** |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude via patcher |
| OpenSpec + release + bootstrap | **Yes** |
| AP/AQ/AR modules | **No** |

## Verification (box harness)

```
cd /workspace/Eos-mission-ao-payload && npm run test:mission-ao
```

→ **16 PASS**, 0 SKIP, 0 FAIL (AO1–AO16)

Slim exclude basename: `eos-ao-provider-failover-resilience.test.js`  
Scripts: `npm run test:provider-failover-resilience` / `npm run test:mission-ao`

## Cases

| ID | Result |
| --- | --- |
| AO1 kind + PRODUCTION_READY NO | PASS |
| AO2 primary success | PASS |
| AO3 primary probe fail → secondary under ECR | PASS |
| AO4 primary invoke fail → secondary under ECR | PASS |
| AO5 ECR deny on active → failover | PASS |
| AO6 all exhausted → DENY + receipt; no unbounded retry | PASS |
| AO7 ECR ceiling → ECR_DENY | PASS |
| AO8 Law VI secrets never in receipts | PASS |
| AO9 PRODUCTION_READY NO pinned | PASS |
| AO10 Law VI no static vendor-key literals (rg vendor-prefix CLEAN) | PASS |
| AO11 NON-CLAIM markers | PASS |
| AO12 MISSING_DEP | PASS |
| AO13 setOrder / probeActive / listProviders | PASS |
| AO14 hermetic + fail-closed codes | PASS |
| AO15 INVALID_REQUEST + probe helper + sealReceipt | PASS |
| AO16 HITL on exhaust + getState | PASS |

## Kind / PRODUCTION_READY

- Kind: `eos-provider-failover-resilience-router`
- `AO_PRODUCTION_READY = 'NO'`
