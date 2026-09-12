# Design — Mission AO: Provider Failover & Resilience Router (SPEC-0046)

## Architecture

Injectable **Provider Failover & Resilience Router** sits over AD-style
provider ports and AE-style ECR budget meters:

```
request → route/invoke
        → ECR canSpend?
        → for provider in ordered allowlist:
             probe → fail? next
             invoke → success? record spend + seal receipt
                   → ECR_DENY? next if budget remains else DENY
                   → other fail? next
        → exhausted → FAILOVER_EXHAUSTED + seal receipt (HITL)
```

## Injectables

| Port | Shape |
| --- | --- |
| `providers` | ordered `[{ id, invoke, probe? }, ...]` |
| `ecr` | `{ canSpend(n), record(n), remaining() }` |
| `now` / `hash` | clock + digest |
| `receiptSealer` | optional post-seal hook |

## Fail-closed

- `PROVIDER_PROBE_FAIL` — active probe not-ok → try next
- `ECR_DENY` — budget ceiling / deny on spend
- `FAILOVER_EXHAUSTED` — all candidates failed; latch; no unbounded retry
- `MISSING_DEP` — providers / ecr / invoke absent when required
- `INVALID_REQUEST` — bad route payload / setOrder
- `SECRET_LEAK_FORBIDDEN` — request asks to persist secrets into receipt/EVD
- `HITL_REQUIRED` — optional / set on exhaust

## Law VI

- ZERO static vendor-key prefix literals in src/tests
- Synth secrets at runtime for leak tests
- `sanitizeAoPayload` deep-redacts before receipts / getState
- Never put secrets in sealed receipts or federation envelopes

## NON-CLAIM

failover ≠ PRODUCTION_READY LLM ops ≠ SLA product ≠ multi-cloud billing;
not AP/AQ/AR; Fundacion Δ=0; Antigravity-first; CloudAgent out.

## Reuse

- AD provider port patterns (fake ports, Law VI sanitize)
- AE ECR budget gate patterns (`canSpend` / `record` / ceiling)
- AN/AI patcher CRLF-safe slim-exclude style
