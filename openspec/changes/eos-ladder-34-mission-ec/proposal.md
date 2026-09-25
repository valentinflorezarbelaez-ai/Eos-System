# Proposal — Mission EC Domain Event Compatibility Gate (SPEC-0139)

## Why

After L34 OPEN + Mission EB MEASURED (ADR-0115) + tip-refresh #466 (`19b353d8`), Ladder 34 needs its fourth satellite: a Layer-0 port that seals domain-event compatibility / evolution into `EC-RCPT-*` receipts — without adding schema JSON, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L33, auto-closing L34, or network writes.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `domain-event-compatibility-receipt.js` — sealed `EC-RCPT-*` + freeze soft-observe `19b353d8` + compatibilityHold
  - `domain-event-compatibility-policy-gate.js` — fail-closed govern preconditions
  - `domain-event-compatibility-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-ec-domain-event-compatibility-port.test.js` (EC1–EC17)
- CRLF-safe surgical patcher `scripts/patch-mission-ec.mjs`
- OpenSpec change, ADR-0116

## Non-goals

- New schema JSON; BREAKING / RENAME_FORBIDDEN as PASS; breaking-without-deny misuse; network write; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE;
  L34 auto-close; L30–L33 reopen; tip-refresh; CloudAgent; mass prune

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L33 | CLOSED — NEVER reopen |
| L34 | OPEN (Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC–ED pending) |
| Axis | Sovereign Process Orchestration, CQRS Projection & Domain-Event Evolution Fabric |
| Freeze pin | `19b353d8` (PR #465 EB merge / tip-refresh #466; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | sealed compatibility ≠ new schema JSON ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY |
| Tip-refresh | NOT this package (SEPARATE next) |
