# Proposal — Mission CO Release Integrity & Progressive Honesty Governor Port (SPEC-0098)

## Why

Ladder 26 axis **Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric** needs a Layer-0 port that governs release candidacy against integrity digests (with optional prior CN `attestDigest` / CM `bindDigest` / CL `linkDigest`) under sealed receipts and hermetic honesty labels (HOLD|PROMOTE|ROLLBACK_HINT) — without claiming Argo/Flagger, real canary, GHE, or PRODUCTION_READY flip.

## What changes

- New Layer-0 modules under `src/core/release/`:
  - `release-integrity-receipt.js` — sealed `CO-RCPT-*` receipts
  - `release-integrity-policy-gate.js` — fail-closed govern preconditions
  - `release-integrity-port.js` — facade (`govern`, `evaluate`, `verifyTrail`, `getDecision`)
- Hermetic tests `tests/eos-co-release-integrity-governor-port.test.js`
- CRLF-safe patcher `scripts/patch-mission-co.mjs`
- OpenSpec change, ADR-0060, evidence, release notes

## Non-goals

- PRODUCTION_READY flip; Fundacion writes; Argo/Flagger / real canary / progressive-delivery SaaS; GHE enforcement; CP; tip-refresh; reopen L17–L25

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L25 | CLOSED — never reopen |
| L26 | OPEN (Audit + CL + CM + CN MEASURED · CO in progress · CP pending) |
| Axis | Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric |
| Human authority | Remains on irreversible promote |
