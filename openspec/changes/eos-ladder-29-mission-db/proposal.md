# Proposal — Mission DB Doctor Ritual Automation Port (SPEC-0111)

## Why

After DA MEASURED (#403 @ daae7380), operators need a Layer-0 port that automates/governs doctor ritual plans with honesty — soft-composing DA observability observe when present, soft-observing L28 honesty labels, sealing `DB-RCPT-*` — without flipping PRODUCTION_READY, rewriting tip pins, or reopening L28.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `doctor-ritual-automation-receipt.js` — sealed `DB-RCPT-*` + freeze soft-observe `daae7380`
  - `doctor-ritual-automation-policy-gate.js` — fail-closed govern preconditions
  - `doctor-ritual-automation-port.js` — facade (`govern`, `evaluate`, `getDecision`, `verifyTrail`); soft-compose DA; soft-observe L28 honesty
- Hermetic tests `tests/eos-db-doctor-ritual-automation-port.test.js` (~17)
- CRLF-safe patcher `scripts/patch-mission-db.mjs`
- OpenSpec change, ADR-0083, evidence, release notes

## Non-goals

- PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L29 auto-close; L28 reopen;
  external APM; tip-refresh; new schemas JSON; rewrite freeze tip pins; CloudAgent / Fundacion push

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L28 | CLOSED — never reopen (NEVER reopen L28) |
| L29 | OPEN · DA MEASURED · DB in progress · DC–DE pending |
| Axis | Sovereign Observability & Evidence Economy |
| Freeze pin | `daae7380` (DA MEASURED #403; soft-observe only) |
| Compose | DA required observe; L28 CV–CY soft-observe; freeze NON-CLAIM soft-observe |
| Human gates | FUNDACION_ALWAYS_DENY + PRODUCTION_READY — refuse auto |
| Tip-refresh | NOT this package |
