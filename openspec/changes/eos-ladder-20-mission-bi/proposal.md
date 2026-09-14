# Proposal — Mission BI Cross-Session Continuity & Replay Fabric (SPEC-0066)

## Why

Ladder 20 axis **Sovereign Mission Continuity & Operator Fabric** needs a
typed, fail-closed **Cross-Session Continuity & Replay Fabric** that
custodies session checkpoints, handoffs, and deterministic replay with
sealed continuity receipts. Without it, operator sessions cannot honestly
handoff across session boundaries under evidence custody after BH MEASURED.

## What changes

- New Layer-0 modules under `src/core/continuity/` (NOT `mission/` or `delivery/`):
  - `cross-session-continuity-receipt.js` — sealed `BI-RCPT-*` receipts
  - `cross-session-continuity-policy-gate.js` — fail-closed preconditions
  - `cross-session-continuity-replay-fabric.js` — facade
    (`captureCheckpoint`, `handoffSession`, `replaySessionHistory`)
- Hermetic tests `tests/eos-bi-cross-session-continuity-replay-fabric.test.js`
- CRLF-safe patcher `scripts/patch-mission-bi.mjs` (scripts + SLIM exclude)
- OpenSpec change, ADR-0025, evidence, release notes

## Non-goals

- PRODUCTION_READY flip
- Fundacion writes
- CloudAgent
- HA multi-region SaaS / Raft/distributed clustering product claims
- BJ–BL implementation
- Reopening L17 / L18 / L19
- Rewriting `src/core/mission/*` or `src/core/delivery/*` or AT/AI/W/AL sources

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17 / L18 / L19 | CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen |
| L20 | OPEN (BH MEASURED; BI in progress; BJ–BL pending) |
| Axis | Sovereign Mission Continuity & Operator Fabric |
| Antigravity-first | yes |
| SLIM | ≤145 (BI test excluded) |
| Base tip | `82cbb86d3902f8637ace2f830e383cbb36a94f00` (StartsWith `82cbb86`) |
