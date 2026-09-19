# Design — Mission CR Evidence Trail Ritual Binding Port

## Architecture

```
plan { planId, trailMode: FIXTURE|LIVE, trail: EvidenceTrail, reasons? }
        │
        ▼
EvidenceTrailPolicyGate.evaluatePlan
        │ deny → CR-RCPT decision=DENY
        ▼
validateEvidenceTrail (append-only CL→CM→CN)
  - links.length=3, order CL→CM→CN, seq 1..3
  - prevLinkHash chain (hash of prior link seal body)
  - crossPortRefs consistency
  - LIVE: DENY sampleOnly / dirtyTree / BEHIND|DIVERGED|UNMEASURED
  - trailSealHash integrity + trailId registry replay
        │
        ▼
decision PASS | DENY → trailDigest → CR-RCPT-* nine-field seal
(does NOT mutate CL/CM/CN state)
```

## Nine-field seal

`receiptId, operation, planId, decision, trailId, trailDigest, timestamp, fundacionDelta, prevReceiptHash`

## TrailMode → decision map

| trailMode | condition | decision |
| --- | --- | --- |
| FIXTURE | well-formed chain | PASS |
| LIVE | sampleOnly / dirty / bad lag | DENY |
| any | missing / order / chain / mismatch / unverifiable / replay | DENY |
| (gate reject) | — | DENY |

## Gate rules (fail-closed)

- Require planId, trailMode ∈ {FIXTURE,LIVE}, trail object
- Reject Fundacion / Law VI secrets / PRODUCTION_READY=YES flip
- Reject SIEM / data lake / WORM / GHE claim labels (operator label surface only)
- Reject empty plans, oversize reasons, wrong kind
- Hermetic — no network / no GH API / no new docs/schemas/*.json
