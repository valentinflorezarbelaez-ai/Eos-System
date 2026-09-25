# Proposal — Mission EJ Admission Control & Work-Intake Quotas (SPEC-0146)

## Why

After L36 OPEN + Audit MEASURED (ADR-0124) + tip-refresh #490 (`d7490fee`), Ladder 36 needs its first satellite: a Layer-0 port that seals work-intake / admission-quota governance into `EJ-RCPT-*` receipts — without live OS schedulers, network rate limiters, wall-clock authority, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L35, auto-closing L36, or network writes. Mission DX seals breaker trips but has no intake-quota surface.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `admission-control-intake-receipt.js` — sealed `EJ-RCPT-*` + freeze soft-observe `d7490fee` + admissionHold
  - `admission-control-intake-policy-gate.js` — fail-closed govern preconditions
  - `admission-control-intake-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-ej-admission-control-intake.test.js` (EJ1–EJ17)
- CRLF-safe surgical patcher `scripts/patch-mission-ej.mjs`
- OpenSpec change, ADR-0125

## Non-goals

- Live OS schedulers / network rate limiters / wall-clock quota authority; DX failureThreshold/cooldown extension; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L36 auto-close; L30–L35 reopen; tip-refresh; CloudAgent; mass prune

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L35 | CLOSED — NEVER reopen |
| L36 | OPEN (Audit MEASURED · EJ first · EK–EN pending) |
| Axis | Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric |
| Freeze pin | `d7490fee` (L36 tip-open / tip-refresh #490; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | sealed admission/quota ≠ tip-refresh ≠ PRODUCTION_READY ≠ DX trip |
| Tip-refresh | NOT this package (SEPARATE next) |
