# Spec — multi-agent-swarm-dispatcher (SPEC-0032 / Mission AA)

## Requirement: AgentHandoffEnvelope V3 fail-closed

The system SHALL validate handoff envelopes with `schemaVersion` `'3'`|`3`,
required `handoffId`, `fromRole`, `toRole`, `fromAgentId`, `toAgentId`,
`payload` (object), and `issuedAt` (ISO string). Optional `taskRef`,
`changeId`, and `custody:{prevHash?,sha256?}`. Invalid envelopes SHALL be
rejected with typed `AgentHandoffValidationError` / `{ ok:false, errors[] }`.

### Scenario: Missing schemaVersion

- GIVEN an otherwise valid envelope without schemaVersion
- WHEN `validateAgentHandoffEnvelope` runs
- THEN ok=false AND errors mention schemaVersion / V3

## Requirement: Role alias normalization

Roles PLANNER, CODER, QA SHALL normalize to ARCHITECT, BUILDER, VERIFIER
respectively. Canonical roles after normalize SHALL be only those three.

## Requirement: BUILDER != VERIFIER

If `builder.id === verifier.id`, `dispatch` SHALL deny with
`BUILDER_EQUALS_VERIFIER` and SHALL NOT issue handoffs or claim COMPLETED.

### Scenario: Same agent both roles

- GIVEN builder and verifier share the same id
- WHEN dispatch is invoked
- THEN ok=false AND reason=`BUILDER_EQUALS_VERIFIER` AND state=`DENIED`

## Requirement: Architect → Builder → Verifier flow

Happy-path `dispatch` SHALL run architect plan, issue ARCHITECT→BUILDER
handoff, builder artifact, BUILDER→VERIFIER handoff, then verifier. On
success state SHALL be `COMPLETED` and `PRODUCTION_READY` SHALL remain `'NO'`.

## Requirement: Verify retry budget

On verifier failure the dispatcher MAY loop back to builder up to
`maxRounds` (default 2, clamp ≥1). Exhaustion SHALL escalate with
`ESCALATED_HITL`. Recovery within budget SHALL set `recovered=true`.

## Requirement: Token budget fail-closed

`BoundedOutputFilter` / `filterOutbound` / `observeTokens` over budget
SHALL deny with `TOKEN_BUDGET_EXCEEDED`. No new npm dependencies.

## Requirement: Concurrency cap

In-process `maxConcurrent` SHALL default to 1 and SHALL be capped at 3.
When activeCount ≥ maxConcurrent, dispatch SHALL fail-closed with
`MAX_CONCURRENT_EXCEEDED` (BUSY). Unbounded swarm is forbidden.

## Requirement: Hash-chained receipts / custody

Receipts SHALL chain `prevHash` + `sha256` (genesis = 64 zeros). Issued
handoffs SHALL carry custody `{ prevHash, sha256 }`.

## Requirement: PRODUCTION_READY remains NO + NON-CLAIM

`DISPATCHER_PRODUCTION_READY` SHALL equal `'NO'`.
`health().kind` SHALL equal `eos-multi-agent-swarm-dispatcher`.
Module docs SHALL include NON-CLAIM: not CloudAgent fleet, not unbounded
swarm, not PRODUCTION_READY. Fundacion Δ=0.
