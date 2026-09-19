# Proposal — Mission CQ Local CI Continuity Port (SPEC-0100)

## Why

Ladder 27 axis **Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric** needs a Layer-0 port that elevates post-L26 C `local-ci-surrogate` into a governed continuity surface with sealed `CQ-RCPT-*` receipts, fail-closed policy, and forced BILLING_BLOCKED honesty — without claiming GitHub Actions green, GHE enforcement, or PRODUCTION_READY flip.

## What changes

- New Layer-0 modules under `src/core/ci/`:
  - `local-ci-continuity-receipt.js` — sealed `CQ-RCPT-*` receipts
  - `local-ci-continuity-policy-gate.js` — fail-closed govern preconditions
  - `local-ci-continuity-port.js` — facade (`govern`, `evaluate`, `verifyTrail`, `getDecision`); soft-import surrogate
- Hermetic tests `tests/eos-cq-local-ci-continuity-port.test.js` + fixture double
- CRLF-safe patcher `scripts/patch-mission-cq.mjs`
- OpenSpec change, ADR-0069, evidence, release notes

## Non-goals

- PRODUCTION_READY flip; Fundacion writes; GHA green claim; GHE enforcement; CR–CU; tip-refresh; reopen L17–L26; new schemas JSON; rewrite `local-ci-surrogate.js`

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L26 | CLOSED — never reopen (NEVER reopen L26) |
| L27 | OPEN (Audit MEASURED · CQ in progress · CR–CU pending) |
| Axis | Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric |
| Compose | post-L26 C local-ci-surrogate (soft-import; don't rewrite) |
