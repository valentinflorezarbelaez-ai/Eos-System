# Proposal — Mission CY Mission OS / Control-Plane L0 Residual Honesty Port (SPEC-0108)

## Why

Freeze NON-CLAIMs and Mission OS / control-plane residual honesty (PRODUCTION_READY=NO, Fundacion Δ=0, ≠ GHE, L28 hold) need a governed Layer-0 honesty port with sealed `CY-RCPT-*` receipts after CX MEASURED at `487a38bf`.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `mission-os-control-plane-honesty-receipt.js` — sealed `CY-RCPT-*` + freeze soft-observe
  - `mission-os-control-plane-honesty-policy-gate.js` — fail-closed govern preconditions
  - `mission-os-control-plane-honesty-port.js` — facade (`govern`, `evaluate`, `verifyTrail`, `getDecision`); soft-observe freeze; soft-import CV/CW/CX
- Hermetic tests `tests/eos-cy-mission-os-control-plane-honesty-port.test.js` (~17)
- CRLF-safe patcher `scripts/patch-mission-cy.mjs`
- OpenSpec change, ADR-0079, evidence, release notes

## Non-goals

- PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L28 auto-close; CZ start;
  L27 reopen; tip-refresh; new schemas JSON; rewrite freeze tip pins

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L27 | CLOSED — never reopen (NEVER reopen L27) |
| L28 | OPEN (Audit MEASURED · CV MEASURED · CW MEASURED · CX MEASURED · CY in progress · CZ pending) |
| Axis | Sovereign Operator Control-Plane Composition & HUD/Doctor Ritual Fabric |
| Freeze pin | `487a38bf` (CX MEASURED; soft-observe only) |
| Compose | CV+CW+CX required observe; freeze NON-CLAIM soft-observe |
| Human gates | FUNDACION_ALWAYS_DENY + PRODUCTION_READY — refuse auto |
| Tip-refresh / CZ | NOT this package |
