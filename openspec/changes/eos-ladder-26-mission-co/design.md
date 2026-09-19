# Design — Mission CO Release Integrity & Progressive Honesty Governor Port

## Architecture

```
plan { planId, releaseId, integrityDigest | claims[], honestyMode,
       attestDigest?, bindDigest?, linkDigest?, reasons? }
        │
        ▼
ReleaseIntegrityPolicyGate.evaluatePlan
        │ deny → CO-RCPT decision=DENY
        ▼
hermetic releaseId↔integrityDigest (+ optional CN/CM/CL digests)
honestyMode: HOLD | PROMOTE | ROLLBACK_HINT  (labels only — NOT real deploy)
        │
        ▼
decision PASS | DENY | HOLD → integrityPlanDigest → CO-RCPT-* nine-field seal
```

## Nine-field seal

`receiptId, operation, planId, decision, releaseId, integrityDigest, timestamp, fundacionDelta, prevReceiptHash`

## Honesty → decision map

| honestyMode | decision (when gate valid) |
| --- | --- |
| PROMOTE | PASS (hermetic candidacy — NOT real deploy) |
| HOLD | HOLD |
| ROLLBACK_HINT | HOLD |

## Gate rules (fail-closed)

- Require planId, releaseId, honestyMode ∈ {HOLD,PROMOTE,ROLLBACK_HINT}
- Require integrityDigest (sha256) OR non-empty claims[]
- Optional CN attestDigest / CM bindDigest / CL linkDigest (sha256 when present)
- Reject Fundacion / Law VI secrets / PRODUCTION_READY=YES flip / Argo·Flagger / real canary / progressive-delivery SaaS / GHE labels
- Reject empty plans, oversize claims, invalid or tampered digests
- Hermetic digests + labels only — no network / no GH API / no real canary traffic
