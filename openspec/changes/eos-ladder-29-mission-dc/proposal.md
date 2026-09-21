# Proposal — Mission DC Evidence Economy Custody Ledger Port (SPEC-0112)

## Why

After DA MEASURED (#403 @ daae7380) and DB MEASURED (#405 @ 22d80bce), operators need a Layer-0 port that governs evidence-economy / custody-ledger ritual plans with honesty — soft-composing DA+DB observe when present, soft-observing L28 honesty labels, sealing `DC-RCPT-*` — without flipping PRODUCTION_READY, rewriting tip pins, or reopening L28.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `evidence-economy-custody-ledger-receipt.js` — sealed `DC-RCPT-*` + freeze soft-observe `22d80bce`
  - `evidence-economy-custody-ledger-policy-gate.js` — fail-closed govern preconditions; require DA+DB
  - `evidence-economy-custody-ledger-port.js` — facade (`govern`, `evaluate`, `getDecision`, `verifyTrail`); soft-compose DA+DB; soft-observe L28 honesty
- Hermetic tests `tests/eos-dc-evidence-economy-custody-ledger-port.test.js` (~17)
- CRLF-safe patcher `scripts/patch-mission-dc.mjs`
- OpenSpec change, ADR-0084, evidence, release notes

## Non-goals

- PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L29 auto-close; L28 reopen;
  external APM; tip-refresh; new schemas JSON; rewrite freeze tip pins; CloudAgent / Fundacion push

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L28 | CLOSED — never reopen (NEVER reopen L28) |
| L29 | OPEN · DA MEASURED · DB MEASURED · DC in progress · DD–DE pending |
| Axis | Sovereign Observability & Evidence Economy |
| Freeze pin | `22d80bce` (DB MEASURED #405; soft-observe only) |
| Compose | DA+DB required observe; L28 CV–CY soft-observe; freeze NON-CLAIM soft-observe |
| Human gates | FUNDACION_ALWAYS_DENY + PRODUCTION_READY — refuse auto |
| Tip-refresh | NOT this package |
