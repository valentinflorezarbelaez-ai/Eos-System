# Proposal — Mission CC Mission Economics & Portfolio Budget Governor Port (SPEC-0086)

## Why

Ladder 24 axis **Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric** needs a Layer-0 portfolio governor for multi-mission envelopes (latency/cost/risk) with sealed receipts. Local token/cost circuit breakers exist; portfolio-level governance does not.

## What changes

- New Layer-0 modules under `src/core/economics/`:
  - `mission-portfolio-budget-receipt.js` — sealed `CC-RCPT-*` receipts
  - `mission-portfolio-budget-policy-gate.js` — fail-closed envelope preconditions
  - `mission-portfolio-budget-port.js` — facade (`evaluate`, `verifyTrail`, `getPortfolio`)
- Hermetic tests `tests/eos-cc-mission-portfolio-budget-port.test.js`
- CRLF-safe patcher `scripts/patch-mission-cc.mjs` (scripts + SLIM exclude)
- OpenSpec change, ADR-0046, evidence, release notes

## Non-goals

- PRODUCTION_READY flip
- Fundacion writes
- CloudAgent
- FinOps SaaS / cloud billing product claims
- CD/CE/CF implementation
- Tip-refresh / freeze tip rewrite
- Reopening L17–L23
- Breaking `token-economics-audit-engine.js`

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L23 | CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen |
| L24 | OPEN (Audit + CB MEASURED · CC in progress · CD–CF pending) |
| Axis | Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric |
| Antigravity-first | yes |
| Mode | Hermetic Layer-0 portfolio governor (no network billing) |
