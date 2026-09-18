# Design — Mission CI Human Authority Escalation Federation Port

## Architecture

```
plan { escalationId, projectId, missionId, operatorDecision, irreversibilityClass, reasons? }
        │
        ▼
HitlEscalationFederationPolicyGate.evaluatePlan
        │ deny → CI-RCPT decision=DENY
        ▼
decision ESCALATE | HOLD | DENY
        │
        ▼
escalationDigest = sha256({escalationId, projectId, missionId, …})
        │
        ▼
CI-RCPT-* nine-field seal + store by escalationId (in-memory)
```

## Nine-field seal

`receiptId, operation, escalationId, decision, irreversibilityClass, operatorDecision, timestamp, fundacionDelta, prevReceiptHash`

Plus frozen on receipt: `projectId`, `missionId`, `reasons[]`, `escalationDigest`.

## Gate rules (fail-closed)

- Require non-empty valid `escalationId`, `projectId`, `missionId`
- Require valid `irreversibilityClass` enum
- Valid `operatorDecision` APPROVE|REJECT|DEFER when present
- IRREVERSIBLE MUST have explicit human APPROVE|REJECT (or DEFER→HOLD); never auto-APPROVE
- Reject Fundacion targets / Law VI secrets
- Reject empty plan / oversize reasons

## Isolation doctrine

Pure `node:crypto`. Hermetic escalation binding. Does NOT auto-approve irreversible. Human remains authority. Does not touch Fundacion trees.
