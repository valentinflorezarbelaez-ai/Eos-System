# Proposal — Mission BH Lifecycle State Machine (SPEC-0065)

## Why

Ladder 20 axis **Sovereign Mission Continuity & Operator Fabric** needs a
typed, fail-closed **Mission Lifecycle State Machine** that custodies
mission-state transitions with sealed TransitionReceipts. Without it,
operator sessions cannot honestly advance PROPOSED → OPEN → MEASURED →
CLOSED_FOR_LOCAL_GOVERNED_USE under evidence custody.

## What changes

- New Layer-0 modules under `src/core/mission/` (NOT `delivery/`):
  - `mission-transition-receipt.js` — sealed `BH-RCPT-*` receipts
  - `mission-lifecycle-policy-gate.js` — fail-closed preconditions
  - `mission-lifecycle-state-machine.js` — pure FSM facade
- Hermetic tests `tests/eos-bh-mission-lifecycle-state-machine.test.js`
- CRLF-safe patcher `scripts/patch-mission-bh.mjs` (scripts + SLIM exclude)
- OpenSpec change, ADR-0024, evidence, release notes

## Non-goals

- PRODUCTION_READY flip
- Fundacion writes
- CloudAgent
- Jira/PM SaaS / distributed consensus / multi-region product claims
- BI–BL implementation
- Reopening L17 / L18 / L19
- Rewriting `src/core/delivery/*`

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17 / L18 / L19 | CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen |
| L20 | OPEN (BH in progress; BI–BL pending) |
| Axis | Sovereign Mission Continuity & Operator Fabric |
| Antigravity-first | yes |
| SLIM | ≤145 (BH test excluded) |
| Base tip | `e2e78a38be3a92e8c209c8dbe4814d575544b5ce` (StartsWith `e2e78a3`) |
