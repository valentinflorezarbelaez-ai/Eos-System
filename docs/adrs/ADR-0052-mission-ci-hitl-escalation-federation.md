# ADR-0052 — Mission CI Human Authority Escalation Federation Port

- **Status:** Accepted — local governed (Ladder 25 Satellite 3)
- **Date:** 2026-09-18
- **Deciders:** EOS local governed use (Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric)
- **Spec:** SPEC-0092

## Context

HITL fragments exist across missions. EOS lacked a cross-project escalation port that binds operator decisions to mission gates with sealed receipts — without claiming autonomous approval of irreversible actions.

Mission CI delivers a pure Layer-0 Human Authority Escalation Federation Port that:
1. Accepts escalation plans with escalationId, projectId, missionId, operatorDecision (APPROVE|REJECT|DEFER), irreversibilityClass (REVERSIBLE|PARTIALLY_REVERSIBLE|IRREVERSIBLE).
2. Validates plans fail-closed (missing ids, invalid enums, Law VI secrets, Fundacion, oversize reasons).
3. Requires explicit human APPROVE or REJECT for IRREVERSIBLE actions — never auto-APPROVE; human remains authority.
4. Decides ESCALATE | HOLD | DENY and seals `CI-RCPT-*` receipts.
5. Verifies hash-chained custody via `verifyTrail()`.

## Decision

1. Implement three Layer-0 modules under `src/core/authority/`:
   - `hitl-escalation-federation-receipt.js`: Canonical nine-field SHA-256 sealed receipts (`CI-RCPT-*`) via `node:crypto`.
   - `hitl-escalation-federation-policy-gate.js`: Fail-closed escalation validation.
   - `hitl-escalation-federation-port.js`: Unified port facade (`escalate`, `verifyTrail`, `getEscalation`).
2. Valid APPROVE reversible → ESCALATE; DEFER → HOLD; REJECT → DENY; gate reject → DENY.
3. Exclude satellite test suite `tests/eos-ci-hitl-escalation-federation-port.test.js` from default slim discovery; opt-in via `npm run test:mission-ci` / `test:hitl-escalation-federation`.
4. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, ≠ autonomous approval of irreversible / human remains authority.
5. Do **not** rewrite freeze/matrix/dirty-defer/m4 tip pins in this mission (freeze tip stays on CH #348 tip `5432f046…` until SEPARATE tip-refresh).

## Alternatives considered AND REJECTED

### A. Autonomous auto-APPROVE of irreversible actions
**Rejected.** Human remains authority; IRREVERSIBLE requires explicit human APPROVE|REJECT.

### B. Writing into Fundacion trees during escalation
**Rejected.** Fundacion Δ=0 ALWAYS_DENY invariant.

### C. Tip-refresh / freeze tip rewrite inside this mission
**Rejected.** Freeze/matrix tip pin stays on Ladder 25 CH tip until a SEPARATE tip-refresh after CI merges.

### D. Claiming PRODUCTION_READY=YES
**Rejected.** PRODUCTION_READY=NO for this governed local surface.

## Consequences

- **Positive:** Sealed cross-project HITL escalation binding with chained CI receipts; ~18 hermetic tests; zero secrets; Fundacion Δ=0; L25 axis continued without autonomous irreversible claims.
- **Negative:** Escalation is a local governed hermetic surface — not autonomous production approval.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI held; L17–L24 never reopen.

## NON-CLAIMS

- Human Authority Escalation Federation ≠ autonomous approval of irreversible actions
- Human remains authority
- ≠ Fundacion writes (Δ=0)
- PRODUCTION_READY=NO (never flip in this mission)
- ≠ tip-refresh; ≠ Mission CJ
