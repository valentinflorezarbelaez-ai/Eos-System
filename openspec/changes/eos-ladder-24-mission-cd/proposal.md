# Proposal — Mission CD Fleet Project Registry & Governed Activation Port (SPEC-0087)

## Why

Ladder 24 axis **Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric** needs a Layer-0 governed activation port that binds project SSOT digests → mission allowlists without Fundacion bleed. Projects registry & dossiers exist; EOS lacks the activation port (`CD-RCPT-*`).

## What changes

- New Layer-0 modules under `src/core/projects/`:
  - `fleet-activation-receipt.js` — sealed `CD-RCPT-*` receipts
  - `fleet-activation-policy-gate.js` — fail-closed activation preconditions
  - `fleet-activation-port.js` — facade (`activate`, `verifyTrail`, `getActivation`)
- Hermetic tests `tests/eos-cd-fleet-activation-port.test.js`
- CRLF-safe patcher `scripts/patch-mission-cd.mjs` (scripts + SLIM exclude)
- OpenSpec change, ADR-0047, evidence, release notes

## Non-goals

- PRODUCTION_READY flip
- Fundacion writes
- CloudAgent / Kubernetes multi-cluster control plane claims
- CE/CF implementation
- Tip-refresh / freeze tip rewrite
- Reopening L17–L23
- Breaking existing projects registry / dossier surfaces

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L23 | CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen |
| L24 | OPEN (Audit + CB + CC MEASURED · CD in progress · CE–CF pending) |
| Axis | Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric |
| Antigravity-first | yes |
| Mode | Hermetic Layer-0 activation port (no k8s/cloud) |
