# Proposal — Mission EH Temporal Honesty & Deadline Attestation (SPEC-0144)

## Why

After L35 OPEN + Audit MEASURED (ADR-0118) + Mission EE MEASURED (ADR-0119) + Mission EF MEASURED (ADR-0120) + Mission EG MEASURED (ADR-0121) + tip-refresh #481 (`ff4b6d19`), Ladder 35 needs its fourth satellite: a Layer-0 port that attests temporal honesty of deadline/TTL/schedule/compensation receipts into `EH-RCPT-*` — without claiming wall-clock authority, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L34, auto-closing L35, or adding schema JSON.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `temporal-honesty-attestation-receipt.js` — sealed `EH-RCPT-*` + freeze soft-observe `ff4b6d19` + attestationHold
  - `temporal-honesty-attestation-policy-gate.js` — fail-closed govern preconditions
  - `temporal-honesty-attestation-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-eh-temporal-honesty-attestation-port.test.js` (EH1–EH17)
- CRLF-safe surgical patcher `scripts/patch-mission-eh.mjs`
- OpenSpec change, ADR-0122

## Non-goals

- Live timer / wall-clock authority claims; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE;
  L35 auto-close; L30–L34 reopen; tip-refresh; CloudAgent; mass prune

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L34 | CLOSED — NEVER reopen |
| L35 | OPEN (Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH–EI pending) |
| Axis | Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric |
| Freeze pin | `ff4b6d19` (EG merge / tip-refresh #481; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | hermetic honesty attestation ≠ wall-clock authority ≠ tip-refresh ≠ PRODUCTION_READY |
| Tip-refresh | NOT this package (SEPARATE next) |
