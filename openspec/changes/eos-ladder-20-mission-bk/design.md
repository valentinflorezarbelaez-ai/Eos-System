# Design — Mission BK Governed External Write Orchestrator (SPEC-0068)

## Overview

Layer-0 hermetic orchestrator under `src/core/orchestration/` composing
T-gate / write-barrier / BC / BD via injectable ports only. No real fs
writes to Fundacion or Documents; simulate apply/delivery via ports.
Fail-closed DENY + sealed failure/rollback receipt.

## Components

1. **Receipt** — eight-field SHA-256 seal:
   `{ receiptId, targetProjectId, targetPaths, preconditionMask, status,
     rollbackExecuted, timestamp, prevReceiptHash }` → `BK-RCPT-*`
2. **Policy gate** — FUNDACION_ALWAYS_DENY, allowlist, Level 2 auth,
   path containment, malformed DENY, six-precondition mask
3. **Orchestrator** — `createGovernedExternalWriteOrchestrator({ now, hash, ports })`
   - `validatePreconditions(targetProject, context)`
   - `executeGovernedWrite(...)` — validate → DENY Fundacion → allowlist →
     ports.bcApply / ports.bdDelivery stubs → seal receipt; on partial →
     automatic rollback + sealed rollback receipt
   - `rollbackWrite(...)` — explicit rollback with sealed receipt

## Preconditions (bitmask / object)

| Bit | Key | Meaning |
| --- | --- | --- |
| 0 | registry | Registry present |
| 1 | intake | Intake present |
| 2 | spec | Spec present |
| 3 | audit | Audit present |
| 4 | ownerApproval | Owner approval present |
| 5 | level2Auth | Level 2 auth present |

## Ports (injectable stubs ONLY)

- `ports.tGate` — T-gate observe
- `ports.bcApply` — BC apply / rollback simulate
- `ports.bdDelivery` — BD delivery / abort simulate
- `ports.writeBarrier` — optional write-barrier observe

## Constraints

- PRODUCTION_READY=NO; Fundacion Δ=0; Antigravity-first; Law VI CLEAN
- NO rewrite of write-barrier / delivery / T-gate siblings
- SLIM ≤145 via exclude of BK hermetic satellite test
- L17/L18/L19 CLOSED never reopen; L20 OPEN

## NON-CLAIM

≠ unsupervised fleet deploy · ≠ K8s/ArgoCD CD · ≠ PRODUCTION_READY=YES
