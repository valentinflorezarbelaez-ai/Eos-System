# Design — Mission CJ Continuous Adversarial Verification Port

## Architecture

```
plan { probeId, targets[] { claimId, claimedStatus, evidenceDigest?, expectedDigest?, evidenceQuality? }, reasons? }
        │
        ▼
AdversarialVerificationPolicyGate.evaluatePlan
        │ deny → CJ-RCPT decision=DENY
        ▼
hermetic challenge of MEASURED claims (digest presence / consistency / weak quality)
        │
        ▼
decision PASS | CHALLENGE | DENY
        │
        ▼
probeDigest = sha256({probeId, targets, findings, decision})
        │
        ▼
CJ-RCPT-* nine-field seal + store by probeId (in-memory)
```

## Nine-field seal

`receiptId, operation, probeId, decision, targetCount, findingsDigest, timestamp, fundacionDelta, prevReceiptHash`

Plus frozen on receipt: `targets[]`, `findings[]`, `reasons[]`, `probeDigest`.

## Gate rules (fail-closed)

- Require non-empty valid `probeId`
- Require 1..CJ_MAX_TARGETS targets with valid `claimId` + `claimedStatus` MEASURED|UNKNOWN|BLOCKED
- Reject Fundacion targets / Law VI secrets
- Reject GHE-enforcement claim labels
- Reject empty probe / oversize targets

## Challenge rules (hermetic)

- MEASURED + missing evidenceDigest → FAIL → DENY
- MEASURED + non-sha256 / mismatch expectedDigest → FAIL → DENY
- MEASURED + evidenceQuality=weak → WARN → CHALLENGE
- MEASURED + consistent digest → INFO → PASS (if no WARN/FAIL)
- UNKNOWN|BLOCKED → INFO (no MEASURED assertion)

## Isolation doctrine

Pure `node:crypto`. Hermetic probe. No network. No GH API. Does not touch Fundacion trees. ≠ red-team product / ≠ GHE enforcement.
