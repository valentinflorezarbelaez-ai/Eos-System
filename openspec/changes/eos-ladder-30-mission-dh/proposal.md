# Proposal — Mission DH Quarantine / Soft-Remove Execution Port (SPEC-0117)

## Why

After L29 CLOSED + L30 audit (#413) + tip-open #414 + Mission DF MEASURED (#415) + Mission DG MEASURED (#416), operators need a Layer-0 port that executes approved PO Level-2 named-path dispositions via reversible, non-destructive soft quarantine into sealed `DH-RCPT-*` receipts — without unrecoverable hard deletes, unsupervised pruning, flipping PRODUCTION_READY, rewriting tip pins, reopening L29, or auto-closing L30.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `quarantine-execution-receipt.js` — sealed `DH-RCPT-*` + freeze soft-observe `06af7278` + quarantinedPaths + manifestDigest + ceilingHold.
  - `quarantine-execution-policy-gate.js` — fail-closed pre-execution preconditions (verifies DG disposition receipt linkage, rejects hard deletes, rejects unapproved paths, enforces Law VI and Fundacion Δ=0).
  - `quarantine-execution-port.js` — facade (`govern`, `evaluate`, `getDecision`, `verifyTrail`); soft-observes freeze; links DG disposition receipts; executes atomic soft quarantine move to isolated quarantine target.
- Hermetic test suite `tests/eos-dh-quarantine-execution-port.test.js` (~17 tests).
- OpenSpec change, ADR-0090, evidence record.

## Non-goals

- Destructive / unrecoverable hard deletes (`rm -rf`); mass prune; unsupervised execution;
- PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L30 auto-close; L29 reopen;
- new schemas JSON; CloudAgent / Fundacion push.

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L29 | CLOSED — NEVER reopen |
| L30 | OPEN (Audit + DF + DG MEASURED · DH–DJ pending) |
| Axis | Sovereign Complexity Ceiling Governance & Maturity Hardening Fabric |
| Freeze pin | `06af7278` (Real Provider Execution PR; soft-observe only) |
| Compose | DG_DISPOSITION_RECEIPT + ADR_0075_HITL required link; freeze NON-CLAIM soft-observe |
| Ceiling | schemas AT_CEILING 35/35 |
| Human gates | FUNDACION_ALWAYS_DENY + PRODUCTION_READY — refuse auto |
| Execution mode | Soft quarantine / atomic move only (zero data loss) |
| Tip-refresh | NOT this package |
