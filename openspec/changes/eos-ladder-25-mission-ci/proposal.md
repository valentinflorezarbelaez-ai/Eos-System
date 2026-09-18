# Proposal — Mission CI Human Authority Escalation Federation Port (SPEC-0092)

## Why

Ladder 25 axis **Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric** needs a Layer-0 cross-project escalation port that binds operator decisions to mission gates with sealed receipts — without autonomous approval of irreversible actions. HITL fragments exist; EOS lacks the escalation federation port (`CI-RCPT-*`).

## What changes

- New Layer-0 modules under `src/core/authority/`:
  - `hitl-escalation-federation-receipt.js` — sealed `CI-RCPT-*` receipts
  - `hitl-escalation-federation-policy-gate.js` — fail-closed escalation preconditions
  - `hitl-escalation-federation-port.js` — facade (`escalate`, `verifyTrail`, `getEscalation`)
- Hermetic tests `tests/eos-ci-hitl-escalation-federation-port.test.js`
- CRLF-safe patcher `scripts/patch-mission-ci.mjs` (scripts + SLIM exclude)
- OpenSpec change, ADR-0052, evidence, release notes

## Non-goals

- PRODUCTION_READY flip
- Fundacion writes
- Autonomous approval of irreversible actions
- CJ–CK implementation
- Tip-refresh / freeze tip rewrite
- Reopening L17–L24

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L24 | CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen |
| L25 | OPEN (Audit + CG + CH MEASURED · CI in progress · CJ–CK pending) |
| Axis | Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric |
| Antigravity-first | yes |
| Mode | Hermetic Layer-0 HITL escalation federation (human remains authority) |
