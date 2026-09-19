# Design — Mission CL Spec↔Code Traceability Graph Port

## Architecture

```
plan { planId, nodes[] { specId, codePath?, moduleId?, evidenceDigest? }, reasons? }
        │
        ▼
SpecCodeTraceabilityPolicyGate.evaluatePlan
        │ deny → CL-RCPT decision=DENY
        ▼
hermetic Spec↔Code binding (valid surface + optional sha256 evidenceDigest)
        │
        ▼
decision PASS | DENY
        │
        ▼
graphDigest = sha256({planId, nodes, decision})
        │
        ▼
CL-RCPT-* nine-field seal + store by planId (in-memory)
```

## Nine-field seal

`receiptId, operation, planId, decision, nodeCount, nodesDigest, timestamp, fundacionDelta, prevReceiptHash`

Plus frozen on receipt: `nodes[]`, `reasons[]`, `graphDigest`.

## Gate rules (fail-closed)

- Require non-empty valid `planId`
- Require 1..CL_MAX_NODES nodes with valid `specId` + (`codePath` or `moduleId`)
- Reject Fundacion targets / Law VI secrets
- Reject LSP/IDE, GitHub-code-search, and GHE-enforcement claim labels
- Reject empty plans / oversize graphs / invalid evidenceDigest hex

## Isolation doctrine

Pure `node:crypto`. Hermetic binding. No network. No GH API. Does not touch Fundacion trees. ≠ LSP/IDE / ≠ GitHub code search / ≠ GHE.
