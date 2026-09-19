# Proposal — Mission CR Evidence Trail Ritual Binding Port (SPEC-0101)

## Why

Ladder 27 axis **Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric** needs a Layer-0 port that elevates post-L26 Workstream D Evidence Trail Ritual design into a governed surface with sealed `CR-RCPT-*` receipts, append-only CL→CM→CN linkage validation, and fail-closed policy — without claiming SIEM, production data lake, auto-close L26, new schemas JSON, or PRODUCTION_READY flip.

## What changes

- New Layer-0 modules under `src/core/evidence/`:
  - `evidence-trail-receipt.js` — sealed `CR-RCPT-*` receipts + link/trail seal helpers
  - `evidence-trail-policy-gate.js` — fail-closed verify preconditions
  - `evidence-trail-port.js` — facade (`govern`, `verify`, `evaluate`, `verifyTrail`, `getDecision`)
- Hermetic tests `tests/eos-cr-evidence-trail-port.test.js` + Workstream D sample fixture
- CRLF-safe patcher `scripts/patch-mission-cr.mjs`
- OpenSpec change, ADR-0070, evidence, release notes

## Non-goals

- PRODUCTION_READY flip; Fundacion writes; SIEM / data lake / WORM / Sigstore / GHE product;
  auto-close L26; new schemas JSON; mutate CL/CM/CN; CS–CU; tip-refresh; reopen L17–L26

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L26 | CLOSED — never reopen (NEVER reopen L26) |
| L27 | OPEN (Audit MEASURED · CQ MEASURED · CR in progress · CS–CU pending) |
| Axis | Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric |
| Elevate | post-L26 D design + fixture (ADR-0065) → governed port |
