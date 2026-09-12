# Design — Mission AA (SPEC-0032)

## Architecture

```
createMultiAgentDispatcher({
  architect|planner?,   // { id, run|plan }
  builder|coder?,       // { id, run|build }
  verifier|qa?,         // { id, run|verify }
  personas?,            // alternate inject map
  boundedOutputFilter?, // createBoundedOutputFilter default
  tokenBudget?, maxRounds?=2, maxConcurrent?=1 (cap 3),
  hash?, now?, onReceipt?, idFactory?
})
  dispatch(change) / run(change)
    1. activeCount >= maxConcurrent → MAX_CONCURRENT_EXCEEDED (BUSY)
    2. missing persona → MISSING_PERSONA / DENIED
    3. builder.id === verifier.id → BUILDER_EQUALS_VERIFIER / DENIED (fail-closed)
    4. PLANNING: architect.run → issueHandoff ARCHITECT→BUILDER (V3 + custody)
    5. loop round=1..maxRounds:
         BUILDING: builder.run → handoff BUILDER→VERIFIER
         VERIFYING: verifier.run
         ok → COMPLETED (+ VERIFY_RECOVERED if round>1)
         fail + rounds left → retry builder
         fail + exhausted → ESCALATED_HITL
    6. BoundedOutputFilter over budget → TOKEN_BUDGET_EXCEEDED / DENIED
  health/getState/getReceipts/getHandoffs
    kind:'eos-multi-agent-swarm-dispatcher', PRODUCTION_READY:'NO',
    cloudAgent:false, unboundedSwarm:false
```

## AgentHandoffEnvelope V3 (frozen fields)

| Field | Rule |
|-------|------|
| schemaVersion | `'3'` \| `3` required |
| handoffId, fromAgentId, toAgentId | non-empty string |
| fromRole, toRole | ARCHITECT\|PLANNER\|BUILDER\|CODER\|VERIFIER\|QA → normalize |
| payload | object required |
| issuedAt | ISO-8601 string |
| taskRef, changeId | optional string |
| custody | optional `{ prevHash?, sha256? }` |

Aliases: PLANNER→ARCHITECT, CODER→BUILDER, QA→VERIFIER.

## State machine

`IDLE → PLANNING → BUILDING → VERIFYING → COMPLETED | ESCALATED_HITL | DENIED` (+ BUSY for concurrency deny)

## Controls

| ID | Control |
|----|---------|
| AA1 | kind + PRODUCTION_READY NO |
| AA2 | happy path architect→builder→verifier |
| AA3 | BUILDER == VERIFIER same id → fail-closed |
| AA4 | invalid envelope rejected |
| AA5 | schema V3 required |
| AA6 | verify fail then recover within budget |
| AA7 | exhaust rounds → ESCALATED_HITL |
| AA8 | token budget exceeded via BoundedOutputFilter |
| AA9 | role alias normalization |
| AA10 | maxConcurrent / busy fail-closed |
| AA11 | handoff receipt chain / custody |
| AA12 | NON-CLAIM source strings |
| AA13+ | missing persona, alias ports, custody invalid, filter helpers |

## Honesty / NON-CLAIM

- not CloudAgent fleet
- not unbounded swarm
- not PRODUCTION_READY
- handoff receipts ≠ PRODUCTION_READY
- Fundacion Δ=0
- BUILDER != VERIFIER forever

## Non-goals

No PRODUCTION_READY flip. No CloudAgent. No unbounded swarm. No TR-01 raise. No new npm deps. No Fundacion touches.
