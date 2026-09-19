# Design — Mission CM Evidence Binding & Claim Custody Port

## Architecture

```
plan { planId, claims[] { claimId, evidenceDigest, linkDigest?, specId?, codePath? }, reasons? }
        │
        ▼
EvidenceBindingPolicyGate.evaluatePlan
        │ deny → CM-RCPT decision=DENY
        ▼
hermetic claimId↔evidenceDigest binding (+ optional prior CL linkDigest)
        │
        ▼
decision PASS | DENY
        │
        ▼
bindingDigest = sha256({planId, claims, decision})
        │
        ▼
CM-RCPT-* nine-field seal + store by planId (in-memory)
```

## Nine-field seal

`receiptId, operation, planId, decision, claimCount, claimsDigest, timestamp, fundacionDelta, prevReceiptHash`

Plus frozen on receipt: `claims[]`, `reasons[]`, `bindingDigest`.

## Gate rules (fail-closed)

- Require non-empty valid `planId`
- Require 1..CM_MAX_CLAIMS claims with valid `claimId` + sha256 `evidenceDigest`
- Optional prior CL `linkDigest` must be sha256 hex when present
- Reject Fundacion targets / Law VI secrets
- Reject WORM SaaS, external audit, SIEM, data lake, and GHE-enforcement claim labels
- Reject empty plans / oversize claim sets / invalid or tampered digests

## Isolation doctrine

Pure `node:crypto`. Hermetic binding. No network. No GH API. Does not touch Fundacion trees. ≠ WORM SaaS / ≠ external audit / ≠ SIEM / ≠ data lake / ≠ GHE.
