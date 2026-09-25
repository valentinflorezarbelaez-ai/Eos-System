# Proposal — Mission EB Dead-Letter Quarantine Port (SPEC-0138)

## Why

After L34 OPEN + Mission EA MEASURED (ADR-0114) + tip-refresh #464 (`037f9578`), Ladder 34 needs its third satellite: a Layer-0 port that seals dead-letter / poison-message quarantine into `EB-RCPT-*` receipts — without silent drop, unsupervised retry, network writes, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L33, auto-closing L34, or adding schema JSON.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `dead-letter-quarantine-receipt.js` — sealed `EB-RCPT-*` + freeze soft-observe `037f9578` + quarantineHold
  - `dead-letter-quarantine-policy-gate.js` — fail-closed govern preconditions
  - `dead-letter-quarantine-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-eb-dead-letter-quarantine-port.test.js` (EB1–EB17)
- CRLF-safe surgical patcher `scripts/patch-mission-eb.mjs`
- OpenSpec change, ADR-0115

## Non-goals

- Silent drop; unsupervised retry; live broker write; network write; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE;
  L34 auto-close; L30–L33 reopen; tip-refresh; new schemas JSON; CloudAgent; mass prune

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L33 | CLOSED — NEVER reopen |
| L34 | OPEN (Audit MEASURED · DZ MEASURED · EA MEASURED · EB–ED pending) |
| Axis | Sovereign Process Orchestration, CQRS Projection & Dead-Letter Governance Fabric |
| Freeze pin | `037f9578` (PR #463 EA merge / tip-refresh #464; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | sealed quarantine ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY ≠ silent drop |
| Tip-refresh | NOT this package (SEPARATE next) |
