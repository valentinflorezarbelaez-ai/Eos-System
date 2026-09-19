# Proposal — Mission CM Evidence Binding & Claim Custody Port (SPEC-0096)

## Why

Ladder 26 axis **Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric** needs a Layer-0 port that binds MEASURED claims to evidence digests (and optional prior CL Spec↔Code `linkDigest`) with sealed custody receipts. EOS lacks the Evidence Binding & Claim Custody Port (`CM-RCPT-*`).

## What changes

- New Layer-0 modules under `src/core/evidence/`:
  - `evidence-binding-receipt.js` — sealed `CM-RCPT-*` receipts
  - `evidence-binding-policy-gate.js` — fail-closed bind preconditions
  - `evidence-binding-port.js` — facade (`bind` / `claim`, `verifyTrail`, `getBinding`)
- Hermetic tests `tests/eos-cm-evidence-binding-port.test.js`
- CRLF-safe patcher `scripts/patch-mission-cm.mjs` (scripts + SLIM exclude)
- OpenSpec change, ADR-0057, evidence, release notes

## Non-goals

- PRODUCTION_READY flip
- Fundacion writes
- WORM SaaS / external audit product / SIEM / production data lake
- GH Enterprise enforcement claims / GH API
- CN–CP implementation
- Tip-refresh / freeze tip rewrite
- Reopening L17–L25

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L25 | CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen |
| L26 | OPEN (Audit + CL MEASURED · CM in progress · CN–CP pending) |
| Axis | Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric |
| Antigravity-first | yes |
| Mode | Hermetic Layer-0 claim↔evidence custody (no network / no GH API) |
