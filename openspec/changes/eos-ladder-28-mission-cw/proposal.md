# Proposal — Mission CW Cross-Port Continuity Orchestration Port (SPEC-0106)

## Why

CU seam-pack unifies CQ→CT in CI require/smoke, but EOS lacks an operator-facing Layer-0 orchestration **port** composing CQ↔CR↔CS↔CT beyond the CI seam without rewriting CU or reopening L27. Ladder 28 axis needs this satellite after CV MEASURED.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `cross-port-continuity-orchestration-receipt.js` — sealed `CW-RCPT-*`
  - `cross-port-continuity-orchestration-policy-gate.js` — fail-closed govern preconditions
  - `cross-port-continuity-orchestration-port.js` — facade (`govern`, `evaluate`, `verifyTrail`, `getDecision`); soft-import CV honesty
- Hermetic tests `tests/eos-cw-cross-port-continuity-orchestration-port.test.js` (17)
- CRLF-safe patcher `scripts/patch-mission-cw.mjs`
- OpenSpec change, ADR-0077, evidence, release notes

## Non-goals

- GHE enforcement; CU rewrite; PRODUCTION_READY flip; Fundacion writes; reopen L27; tip rewrite;
  CX; tip-refresh; new schemas JSON; wholesale-replace operator-doctor.js / operator-hud.js;
  require live CQ–CT/CU govern for happy path

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L27 | CLOSED — never reopen (NEVER reopen L27) |
| L28 | OPEN (Audit MEASURED · CV MEASURED · CW in progress · CX–CZ pending) |
| Axis | Sovereign Operator Control-Plane Composition & HUD/Doctor Ritual Fabric |
| Freeze pin | `d86d7525` (CV MEASURED; parent tip-refreshes post-CW) |
| Compose | CQ–CT + CU seam observe labels; soft-import CV honesty |
| Human gates | FUNDACION_ALWAYS_DENY + PRODUCTION_READY — refuse auto |
| Tip-refresh / CX | NOT this package |
