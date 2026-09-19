# Design — Mission CQ Local CI Continuity Port

## Architecture

```
plan { planId, runId, continuityMode, continuityDigest | surrogateInput | gateSnapshot,
       ciEnvironment?, reasons? }
        │
        ▼
LocalCiContinuityPolicyGate.evaluatePlan
        │ deny → CQ-RCPT decision=DENY
        ▼
soft-import local-ci-surrogate OR injected/fixture/builtin double
continuityMode: ACTIVE | HOLD  (labels — NOT GHA green)
        │
        ▼
decision PASS | DENY | HOLD → continuityPlanDigest → CQ-RCPT-* nine-field seal
ci_environment FORCED: github_actions=BILLING_BLOCKED,
                       local_surrogate=ACTIVE,
                       github_actions_verdict=NOT_RUN
```

## Nine-field seal

`receiptId, operation, planId, decision, runId, continuityDigest, timestamp, fundacionDelta, prevReceiptHash`

## Continuity → decision map

| continuityMode | surrogate | decision |
| --- | --- | --- |
| ACTIVE | ok | PASS |
| HOLD | (observe / optional) | HOLD |
| ACTIVE | fail (dirty/stale/drift/verify) | DENY |
| (gate reject) | — | DENY |

## Gate rules (fail-closed)

- Require planId, runId, continuityMode ∈ {ACTIVE,HOLD}
- Require continuityDigest (sha256) OR surrogateInput OR gateSnapshot
- Force ci_environment BILLING_BLOCKED / NOT_RUN — refuse GH green overrides
- Reject Fundacion / Law VI secrets / PRODUCTION_READY=YES flip / GHA green / GHE labels
- Reject empty plans, oversize reasons, invalid or tampered digests
- Hermetic — no network / no GH API
