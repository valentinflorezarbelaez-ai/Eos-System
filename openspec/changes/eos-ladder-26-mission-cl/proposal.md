# Proposal — Mission CL Spec↔Code Traceability Graph Port (SPEC-0095)

## Why

Ladder 26 axis **Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric** needs a Layer-0 port that binds SPEC ids to code surfaces with sealed receipts. EOS lacks the Spec↔Code Traceability Graph Port (`CL-RCPT-*`).

## What changes

- New Layer-0 modules under `src/core/traceability/`:
  - `spec-code-traceability-receipt.js` — sealed `CL-RCPT-*` receipts
  - `spec-code-traceability-policy-gate.js` — fail-closed link preconditions
  - `spec-code-traceability-port.js` — facade (`link` / `trace`, `verifyTrail`, `getGraph`)
- Hermetic tests `tests/eos-cl-spec-code-traceability-port.test.js`
- CRLF-safe patcher `scripts/patch-mission-cl.mjs` (scripts + SLIM exclude)
- OpenSpec change, ADR-0056, evidence, release notes

## Non-goals

- PRODUCTION_READY flip
- Fundacion writes
- Full LSP/IDE product
- GitHub code search / GH Enterprise enforcement claims / GH API
- CM–CP implementation
- Tip-refresh / freeze tip rewrite
- Reopening L17–L25

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L25 | CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen |
| L26 | OPEN (Audit MEASURED · CL in progress · CM–CP pending) |
| Axis | Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric |
| Antigravity-first | yes |
| Mode | Hermetic Layer-0 Spec↔Code binding (no network / no GH API) |
