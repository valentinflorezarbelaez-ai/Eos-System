# Proposal — Mission EE Temporal Deadline & TTL Governance (SPEC-0141)

## Why

After L35 OPEN + Audit MEASURED (ADR-0118) + tip-refresh #475 (`9600063c`), Ladder 35 needs its first satellite: a Layer-0 port that seals temporal deadline / TTL governance into `EE-RCPT-*` receipts — without live timers, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L34, auto-closing L35, or network writes. Mission DZ seals saga steps but has no deadline/TTL/timer surface.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `temporal-deadline-ttl-receipt.js` — sealed `EE-RCPT-*` + freeze soft-observe `9600063c` + temporalHold
  - `temporal-deadline-ttl-policy-gate.js` — fail-closed govern preconditions
  - `temporal-deadline-ttl-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-ee-temporal-deadline-ttl-port.test.js` (EE1–EE17)
- CRLF-safe surgical patcher `scripts/patch-mission-ee.mjs`
- OpenSpec change, ADR-0119

## Non-goals

- Live setTimeout / setInterval / network cron; Date.now as EXPIRE authority; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE;
  L35 auto-close; L30–L34 reopen; tip-refresh; CloudAgent; mass prune

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L34 | CLOSED — NEVER reopen |
| L35 | OPEN (Audit MEASURED · EE–EI pending) |
| Axis | Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric |
| Freeze pin | `9600063c` (tip-open L35 / tip-refresh #475; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | sealed deadline/TTL ≠ live timer ≠ tip-refresh ≠ PRODUCTION_READY |
| Tip-refresh | NOT this package (SEPARATE next) |
