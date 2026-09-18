# Design — Mission CG External Tool / MCP Federation Port

## Architecture

```
plan { federationId, toolIds[], allowlist[] }
        │
        ▼
ExternalToolFederationPolicyGate.evaluatePlan
        │ deny → CG-RCPT decision=DENY (toolIds=[], allowlist=[])
        ▼
decision ALLOW (allowlist covers all toolIds; no *)
        │
        ▼
toolCallDigest = sha256({federationId, toolIds, allowlist, decision})
        │
        ▼
CG-RCPT-* nine-field seal + store by federationId
```

## Nine-field seal

`receiptId, operation, federationId, decision, toolCount, toolCallDigest, timestamp, fundacionDelta, prevReceiptHash`

Plus frozen on receipt: `toolIds[]`, `allowlist[]`, `reasons[]`.

## Gate rules (fail-closed)

- Require non-empty `federationId` (not Fundacion path)
- Require toolIds length 1..`CG_MAX_TOOLS` (default 32)
- Require non-empty allowlist; reject unrestricted `*` / `**` / `allow-all`
- Tool ids match MCP-style alphanumeric pattern
- Every requested toolId must be present in allowlist
- Reject Fundacion targets / Law VI secrets
- Reject empty plan

## Isolation doctrine

Pure `node:crypto`. No live MCP network. Does not touch Fundacion trees.
