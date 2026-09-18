# Design — Mission CD Fleet Project Registry & Governed Activation Port

## Architecture

```
plan { projectId, projectSsotDigest (64 hex), allowlist[missionId...] }
        │
        ▼
FleetActivationPolicyGate.evaluatePlan
        │ deny → CD-RCPT decision=DENY (allowed=[], denied=plan missions)
        ▼
decision ALLOW
        │
        ▼
rootDigest = sha256({projectId, projectSsotDigest, allowedMissions, decision})
        │
        ▼
CD-RCPT-* nine-field seal + store by projectId
  (links project SSOT digest → allowed mission ids)
```

## Nine-field seal

`receiptId, operation, projectId, decision, projectSsotDigest, allowedMissionCount, timestamp, fundacionDelta, prevReceiptHash`

Plus frozen arrays on receipt: `allowedMissions[]`, `deniedMissions[]`, `reasons[]`.

## Gate rules (fail-closed)

- Require non-empty `projectId` (not Fundacion path)
- Require `projectSsotDigest` / `ssotDigest` = 64 hex
- Require allowlist length 1..`CD_MAX_MISSIONS`
- Mission ids match `CD_MISSION_ID_PATTERN`
- Reject Fundacion targets / Law VI secrets

## Isolation doctrine

Pure `node:crypto`. No network. No k8s/cloud APIs. Does not touch Fundacion trees.
