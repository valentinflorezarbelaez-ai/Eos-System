# Proposal — Mission DA Control-Plane Observability Aggregation Port (SPEC-0110)

## Why

After L28 CV–CY MEASURED + L29 audit (ADR-0081), operators need a Layer-0 port that aggregates sealed observe labels / honesty signals across CV–CY into a governed observability surface with `DA-RCPT-*` receipts — without flipping PRODUCTION_READY, rewriting tip pins, or reopening L28.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `control-plane-observability-aggregation-receipt.js` — sealed `DA-RCPT-*` + freeze soft-observe `2d6ab2d2`
  - `control-plane-observability-aggregation-policy-gate.js` — fail-closed govern preconditions
  - `control-plane-observability-aggregation-port.js` — facade (`govern`, `evaluate`, `getDecision`, `verifyTrail`); soft-observe freeze; soft-import CV/CW/CX/CY
- Hermetic tests `tests/eos-da-control-plane-observability-aggregation-port.test.js` (~17)
- CRLF-safe patcher `scripts/patch-mission-da.mjs`
- OpenSpec change, ADR-0082, evidence, release notes

## Non-goals

- PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L29 auto-close; L28 reopen;
  external APM; tip-refresh; new schemas JSON; rewrite freeze tip pins; CloudAgent / Fundacion push

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L28 | CLOSED — never reopen (NEVER reopen L28) |
| L29 | Audit MEASURED · DA in progress · DB–DE pending (after tip-open) |
| Axis | Sovereign Observability & Evidence Economy Fabric |
| Freeze pin | `2d6ab2d2` (L29 audit #401; soft-observe only) |
| Compose | CV+CW+CX+CY required observe; freeze NON-CLAIM soft-observe |
| Human gates | FUNDACION_ALWAYS_DENY + PRODUCTION_READY — refuse auto |
| Tip-refresh | NOT this package |
