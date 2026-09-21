# Proposal — Mission CV HUD/Doctor Honesty Ritual Composition Port (SPEC-0105)

## Why

Ladder 28 axis **Sovereign Operator Control-Plane Composition & HUD/Doctor Ritual Fabric** needs a Layer-0 port that elevates post-L26 Workstream B Doctor/HUD honesty surfaces into a governed ritual composition surface with sealed `CV-RCPT-*` receipts, fail-closed policy, and preserved FUNDACION_ALWAYS_DENY + human PRODUCTION_READY gates — without claiming a PRODUCTION_READY flip, L27 reopen, tip rewrite, or starting CW.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `hud-doctor-honesty-ritual-receipt.js` — sealed `CV-RCPT-*` receipts
  - `hud-doctor-honesty-ritual-policy-gate.js` — fail-closed govern preconditions
  - `hud-doctor-honesty-ritual-port.js` — facade (`govern`, `evaluate`, `verifyTrail`, `getDecision`); soft-import B honesty
- Hermetic tests `tests/eos-cv-hud-doctor-honesty-ritual-port.test.js` (18)
- CRLF-safe patcher `scripts/patch-mission-cv.mjs`
- OpenSpec change, ADR-0076, evidence, release notes

## Non-goals

- PRODUCTION_READY flip; Fundacion writes; reopen L27; tip rewrite;
  CW; tip-refresh; new schemas JSON; wholesale-replace operator-doctor.js / operator-hud.js;
  fork/rewrite `doctor-hud-honesty.js`; require live CQ–CT govern for happy path

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L27 | CLOSED — never reopen (NEVER reopen L27) |
| L28 | OPEN (Audit MEASURED · CV in progress · CW–CZ pending) |
| Axis | Sovereign Operator Control-Plane Composition & HUD/Doctor Ritual Fabric |
| Freeze pin | `62d430fb` (audit tip; parent tip-refreshes post-CV) |
| Compose | post-L26 B doctor-hud-honesty (soft-import; don't fork) |
| Human gates | FUNDACION_ALWAYS_DENY + PRODUCTION_READY — refuse auto |
| Tip-refresh / CW | NOT this package |
