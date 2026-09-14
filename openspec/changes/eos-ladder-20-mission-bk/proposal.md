# Proposal — Mission BK Governed External Write Orchestrator (SPEC-0068)

## Why

Ladder 20 axis **Sovereign Mission Continuity & Operator Fabric** needs a
typed, fail-closed **Governed External Write Orchestrator** that validates
six hermetic preconditions, denies Fundacion targets, allowlists paths,
composes T-gate / write-barrier / BC apply / BD delivery via injectable
ports, and seals every outcome (OK / DENY / ROLLBACK) under evidence
custody after BH+BI+BJ MEASURED. Without it, operators cannot honestly
drive external writes with rollback receipts.

## What changes

- New Layer-0 modules under `src/core/orchestration/` (compose, do not rewrite siblings):
  - `governed-external-write-receipt.js` — sealed `BK-RCPT-*` receipts
  - `governed-external-write-policy-gate.js` — fail-closed preconditions
  - `governed-external-write-orchestrator.js` — facade
    (`validatePreconditions`, `executeGovernedWrite`, `rollbackWrite`)
- Hermetic tests `tests/eos-bk-governed-external-write-orchestrator.test.js`
- CRLF-safe patcher `scripts/patch-mission-bk.mjs` (scripts + SLIM exclude)
- OpenSpec change, ADR-0027, evidence, release notes

## Non-goals

- PRODUCTION_READY flip
- Fundacion writes
- CloudAgent
- Unsupervised fleet deploy / K8s/ArgoCD CD product claims
- BL implementation
- Reopening L17 / L18 / L19
- Rewriting write-barrier, delivery BC/BD, or T-gate siblings

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17 / L18 / L19 | CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen |
| L20 | OPEN (BH+BI+BJ MEASURED; BK in progress; BL pending closeout) |
| Axis | Sovereign Mission Continuity & Operator Fabric |
| Antigravity-first | yes |
| SLIM | ≤145 (BK test excluded) |
| Base tip | `ad643845cc4d008629b6660301fcf4b0c6cb4d74` (StartsWith `ad64384`) |
