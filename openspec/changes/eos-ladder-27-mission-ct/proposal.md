# Proposal — Mission CT Fundacion Δ=0 Continuity Drill & Reconciliation Port (SPEC-0103)

## Why

Ladder 27 axis **Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric** needs a Layer-0 port that elevates post-L26 Workstream F Fundacion Δ=0 gameday into a recurring governed continuity drill / reconciliation surface with sealed `CT-RCPT-*` receipts, fail-closed policy, and preserved FUNDACION_ALWAYS_DENY + human PRODUCTION_READY gates — without claiming Fundacion write auth, a PRODUCTION_READY flip, or weakening ALWAYS_DENY.

## What changes

- New Layer-0 modules under `src/core/continuity/`:
  - `fundacion-delta0-continuity-receipt.js` — sealed `CT-RCPT-*` receipts
  - `fundacion-delta0-continuity-policy-gate.js` — fail-closed govern preconditions
  - `fundacion-delta0-continuity-port.js` — facade (`govern`, `evaluate`, `verifyTrail`, `getDecision`); soft-import gameday
- Hermetic tests `tests/eos-ct-fundacion-delta0-continuity-port.test.js` (19)
- CRLF-safe patcher `scripts/patch-mission-ct.mjs`
- OpenSpec change, ADR-0072, evidence, release notes

## Non-goals

- PRODUCTION_READY flip; Fundacion writes; weaken FUNDACION_ALWAYS_DENY; reopen L26;
  CU; tip-refresh; new schemas JSON; fork/rewrite `fundacion-delta0-gameday.js`

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L26 | CLOSED — never reopen (NEVER reopen L26) |
| L27 | OPEN (Audit MEASURED · CQ MEASURED · CR MEASURED · CS MEASURED · CT in progress · CU pending) |
| Axis | Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric |
| Compose | post-L26 F fundacion-delta0-gameday (soft-import; don't fork) |
| Human gates | FUNDACION_ALWAYS_DENY + PRODUCTION_READY — refuse auto |
| Tip-refresh / CU | NOT this package |
