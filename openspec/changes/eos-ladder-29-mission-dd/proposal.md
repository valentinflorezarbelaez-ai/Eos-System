# Proposal — Mission DD Local CI Ritual Hardening Port (SPEC-0113)

## Why

After DA MEASURED (#403 @ daae7380) and DB MEASURED (#405 @ 22d80bce); DC MEASURED (#407 @ 4d8c6c59), operators need a Layer-0 port that governs evidence-economy / local-ci-ritual-hardening ritual plans with honesty — soft-composing DA+DB+DC observe when present, soft-observing L28 honesty labels, sealing `DD-RCPT-*` — without flipping PRODUCTION_READY, rewriting tip pins, or reopening L28.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `local-ci-ritual-hardening-receipt.js` — sealed `DD-RCPT-*` + freeze soft-observe `4d8c6c59`
  - `local-ci-ritual-hardening-policy-gate.js` — fail-closed govern preconditions; require DA+DB+DC
  - `local-ci-ritual-hardening-port.js` — facade (`govern`, `evaluate`, `getDecision`, `verifyTrail`); soft-compose DA+DB+DC; soft-observe L28 honesty
- Hermetic tests `tests/eos-dd-local-ci-ritual-hardening-port.test.js` (~17)
- CRLF-safe patcher `scripts/patch-mission-dd.mjs`
- OpenSpec change, ADR-0085, evidence, release notes

## Non-goals

- PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L29 auto-close; L28 reopen;
  external APM; tip-refresh; new schemas JSON; rewrite freeze tip pins; CloudAgent / Fundacion push

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L28 | CLOSED — never reopen (NEVER reopen L28) |
| L29 | OPEN · DA MEASURED · DB MEASURED · DD in progress · DE–DF pending |
| Axis | Sovereign Observability & Evidence Economy |
| Freeze pin | `4d8c6c59` (DC MEASURED #407; soft-observe only) |
| Compose | DA+DB+DC required observe; L28 CV–CY soft-observe; freeze NON-CLAIM soft-observe |
| Human gates | FUNDACION_ALWAYS_DENY + PRODUCTION_READY — refuse auto |
| Tip-refresh | NOT this package |
