# Proposal — Mission EF Schedule Wake & Deferred Trigger (SPEC-0142)

## Why

After L35 OPEN + Audit MEASURED (ADR-0118) + Mission EE MEASURED (ADR-0119) + tip-refresh #477 (`0a286ad8`), Ladder 35 needs its second satellite: a Layer-0 port that seals schedule wake / deferred trigger governance into `EF-RCPT-*` receipts — without live cron daemons, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L34, auto-closing L35, or network wakes. Mission EE seals deadlines but has no schedule wake / deferred trigger surface.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `schedule-wake-deferred-receipt.js` — sealed `EF-RCPT-*` + freeze soft-observe `0a286ad8` + scheduleHold
  - `schedule-wake-deferred-policy-gate.js` — fail-closed govern preconditions
  - `schedule-wake-deferred-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-ef-schedule-wake-deferred-port.test.js` (EF1–EF17)
- CRLF-safe surgical patcher `scripts/patch-mission-ef.mjs`
- OpenSpec change, ADR-0120

## Non-goals

- Live setInterval / cron daemon / OS scheduler / network wake; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE;
  L35 auto-close; L30–L34 reopen; tip-refresh; CloudAgent; mass prune

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L34 | CLOSED — NEVER reopen |
| L35 | OPEN (Audit MEASURED · EE MEASURED · EF–EI pending) |
| Axis | Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric |
| Freeze pin | `0a286ad8` (EE merge / tip-refresh #477; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | hermetic deferred-wake ≠ live cron ≠ tip-refresh ≠ PRODUCTION_READY |
| Tip-refresh | NOT this package (SEPARATE next) |
