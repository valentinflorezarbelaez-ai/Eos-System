# Proposal — Mission DG PO Level-2 Named-Path Disposition Gate Port (SPEC-0116)

## Why

After L29 CLOSED + L30 audit (#413) + tip-open #414 + Mission DF MEASURED (#415) + tip-refresh #416, operators need a Layer-0 port that gates PO Level-2 named-path disposition decisions into sealed `DG-RCPT-*` receipts — without executing deletes, auto-approving deletes, flipping PRODUCTION_READY, rewriting tip pins, reopening L29, or auto-closing L30. Delete execution is DH later.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `po-l2-named-path-disposition-receipt.js` — sealed `DG-RCPT-*` + freeze soft-observe `31f811ca` + namedPaths + ceilingHold
  - `po-l2-named-path-disposition-policy-gate.js` — fail-closed govern preconditions
  - `po-l2-named-path-disposition-port.js` — facade (`govern`, `evaluate`, `getDecision`, `verifyTrail`); soft-observe freeze; soft-import DF/HITL
- Hermetic tests `tests/eos-dg-po-l2-named-path-disposition-port.test.js` (~17)
- CRLF-safe patcher `scripts/patch-mission-dg.mjs`
- OpenSpec change, ADR-0089, evidence, release notes

## Non-goals

- Delete execution; auto-approve deletes; unsupervised delete; mass prune; PRODUCTION_READY flip; tip-pin rewrite;
  Fundacion writes; GHE; L30 auto-close; L29 reopen; tip-refresh; new schemas JSON;
  rewrite freeze tip pins; CloudAgent / Fundacion push

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L29 | CLOSED — NEVER reopen |
| L30 | OPEN (Audit + DF MEASURED · DG–DJ pending) via tip-refresh #416 |
| Axis | Sovereign Complexity Ceiling Governance & Maturity Hardening Fabric |
| Freeze pin | `31f811ca` (Mission DF #415; soft-observe only) |
| Compose | DF_REMEASURE+ADR_0075_HITL+AP_HITL required observe; freeze NON-CLAIM soft-observe |
| Ceiling | schemas AT_CEILING 35/35 |
| Human gates | FUNDACION_ALWAYS_DENY + PRODUCTION_READY — refuse auto |
| Gate≠execution | namedPaths sealed ≠ delete execution (DH later) |
| Tip-refresh | NOT this package |
