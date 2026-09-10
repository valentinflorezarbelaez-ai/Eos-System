# EOS T6 Complexity ceiling HOLD / gate - 2026-09-09

**Branch:** cursor/eos-t6-complexity-ceiling-hold
**Base tip:** bf3edc7527a70cf8ecdd38cf75918148a8651efb (T5 #87 merged KEEP PO prune HOLD)
**Alcance:** T6 ONLY (Ladder 8 K6) - EOS-only
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (sin tocar)
**Merge:** NO (push only; HITL en navegador)
**AT_CEILING:** yes (standing order hold; no new docs/schemas JSON)
**Decision:** **HOLD — hold AT_CEILING; no new schemas** (PO has not named exact schema/engine prune paths)

## Objetivo (T6 / K6 DoD)

Standing order hold AT_CEILING **or** PO-named schema/engine prune from P6 inventory; verify lock green; no vibe schemas; PRODUCTION_READY=NO.

1. Deliver **standing order + gate/process** (runbook + verify lock + observational gate CLI)
2. Explicit HOLD (hold AT_CEILING; no new schemas) — no executed prune / quarantine
3. R4 `auditComplexityBudgetLock` remains green under HOLD (35/35 AT_CEILING)
4. NON-CLAIM: HOLD ≠ executed prune; inventory ≠ quarantine; gate ≠ budget bump; no vibe schemas
5. Tests PASS (`test:t6`); Fundacion Delta=0; DEFER dirty unstaged; AT_CEILING

## Decision HOLD (rationale)

- Audit K6 prefers (b) document "hold ceiling; no new schemas" as standing order + verify already enforces, unless PO names deletes.
- P6 CANDIDATE set (32 ranked engine/island paths) is inventory-only until PO names exact paths.
- R4 already fail-closes OVER / dishonest WITHIN_BUDGET in verify:strict.
- Therefore Choice = **HOLD** + standing order + fail-closed ritual; prune execution deferred to a future PO-named change set.

## Entregables

1. OpenSpec `openspec/changes/eos-t6-complexity-ceiling-hold/`
2. Runbook `docs/harness/COMPLEXITY_CEILING_HOLD_RITUAL.md`
3. Lock `scripts/lib/complexity-ceiling-hold-lock.js` + gate `scripts/ci/complexity-ceiling-hold-gate.js`
4. Tests `tests/eos-t6-complexity-ceiling-hold.test.js` + `test:t6`
5. verify-eos 3g17 + REQUIRED_PATHS
6. Esta nota + freeze T6 + matrix MEASURED
7. Dirty DEFER sin stage; no new schemas; no silent/vibe prune

## Budget reconcile (HOLD)

- R4 complexity-budget-lock expected green (schemas 35/35 AT_CEILING; recursive_docs_schemas_json)
- P6 inventory unchanged (32 CANDIDATES inventory-only)
- T6 does **not** mutate `COMPLEXITY_BUDGET.json`, `docs/schemas/**`, or `src/core` engines

## Verificacion

- npm run test:t6
- node scripts/ci/complexity-ceiling-hold-gate.js
- npm run test:r4
- Fundacion porcelain vacio
- PRODUCTION_READY=NO

## No-claims

- HOLD / gate ≠ executed prune / quarantine.
- Inventory (P6) ≠ permission to delete.
- R4 gate green ≠ PRODUCTION_READY flip.
- Gate ≠ raising max_schemas.
- Sin App Fuerza. Sin mutacion Fundacion.
- Sin T7+ Antigravity install / Dirty DEFER triage en esta rama.
- Push only; merge requiere PO / HITL navegador.
- PRODUCTION_READY permanece NO.
- CloudAgent out of SpecBoot default (Antigravity-first).
