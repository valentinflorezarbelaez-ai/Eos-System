# Proposal — Mission EG Long-Running Process Timeout Compensation (SPEC-0143)

## Why

After L35 OPEN + Audit MEASURED (ADR-0118) + Mission EE MEASURED (ADR-0119) + Mission EF MEASURED (ADR-0120) + tip-refresh #479 (`73252208`), Ladder 35 needs its third satellite: a Layer-0 port that seals long-running process timeout compensation governance into `EG-RCPT-*` receipts — without unsupervised compensate, live saga rewrite, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L34, auto-closing L35, or network writes. Mission EE seals deadlines and Mission EF seals deferred wakes, but neither exposes a timeout-compensation surface (ties to EE deadline + DZ saga compensation).

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `process-timeout-compensation-receipt.js` — sealed `EG-RCPT-*` + freeze soft-observe `73252208` + compensationHold
  - `process-timeout-compensation-policy-gate.js` — fail-closed govern preconditions
  - `process-timeout-compensation-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-eg-process-timeout-compensation-port.test.js` (EG1–EG17)
- CRLF-safe surgical patcher `scripts/patch-mission-eg.mjs`
- OpenSpec change, ADR-0121

## Non-goals

- Unsupervised compensate / live saga rewrite / network write; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE;
  L35 auto-close; L30–L34 reopen; tip-refresh; CloudAgent; mass prune

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L34 | CLOSED — NEVER reopen |
| L35 | OPEN (Audit MEASURED · EE MEASURED · EF MEASURED · EG–EI pending) |
| Axis | Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric |
| Freeze pin | `73252208` (EF merge / tip-refresh #479; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| COMPENSATE | fail-closed hermetic ≠ live saga rewrite ≠ tip-refresh ≠ PRODUCTION_READY |
| PASS | hermetic timeout-compensation ≠ unsupervised compensate ≠ tip-refresh ≠ PRODUCTION_READY |
| Tip-refresh | NOT this package (SEPARATE next) |
