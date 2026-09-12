# Spec — token-budget-ecr (SPEC-0036 / Mission AE)

## Requirement: Injectable token-budget circuit breaker

The system SHALL expose `createTokenBudgetCircuitBreaker(options)` (alias
`createECR`) with `kind: 'eos-token-budget-circuit-breaker'` and
`PRODUCTION_READY: 'NO'`. Methods SHALL include `recordUsage`, `check`,
`trip`, `reset`, `health`, `getState`, and `shouldAllow`. Thresholds SHALL
be configurable for tokens and/or estimated cost units.

### Scenario: Under-threshold allow

- GIVEN a breaker with `tokenThreshold: 100`
- WHEN `recordUsage({ tokensIn: 10, tokensOut: 20 })` runs
- THEN the result is `ok:true` / `allow:true` with `code:'ALLOW'`

## Requirement: Trip → DENY + HITL

On threshold exceed the breaker SHALL trip fail-closed and DENY with
`TOKEN_BUDGET_EXCEEDED` or `COST_BUDGET_EXCEEDED` (manual trip →
`ECR_TRIPPED`). DENY results SHALL set `hitlRequired: true` and attach a
receipt `{ code, threshold, used, at, PRODUCTION_READY:'NO' }`. After trip,
further usage/check SHALL DENY until reset.

### Scenario: Exceed trips

- GIVEN `tokenThreshold: 50`
- WHEN usage pushes tokens above 50
- THEN result is DENY with `TOKEN_BUDGET_EXCEEDED` and `hitlRequired:true`

## Requirement: Reset only via opt-in / HITL

`reset()` SHALL fail-closed with `RESET_DENIED` unless `allowReset:true` was
set at create **or** the caller passes explicit HITL confirm
(`{ confirm: true }` / `{ hitlConfirmed: true }`).

## Requirement: BoundedOutputFilter observe compatibility

The breaker SHALL accept an optional injectable `boundedOutputFilter` with
AA-compatible `observeTokens` / `filterOutbound` semantics. AE SHALL also
export a thin self-contained `createBoundedOutputFilter` that emits
`TOKEN_BUDGET_EXCEEDED` without depending on the full swarm module.

## Requirement: Law VI + PRODUCTION_READY NO + NON-CLAIM

State dumps, receipts, and errors SHALL sanitize secret-shaped keys/values
(Law VI). `ECR_PRODUCTION_READY` SHALL equal `'NO'`. Health/state SHALL
include NON-CLAIM markers: ECR ≠ billing platform, ECR ≠ PRODUCTION_READY,
not AF/AG/AH, Fundacion Δ=0. Mission AE SHALL NOT implement AF/AG/AH.
