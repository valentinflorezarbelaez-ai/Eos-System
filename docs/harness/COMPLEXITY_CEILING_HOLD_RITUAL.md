# Complexity ceiling hold ritual (standing order / PO-named gate)

**Status:** ACTIVE runbook (Ladder 8 T6 / K6)
**PRODUCTION_READY:** NO
**Modes:** `HOLD` | `PO_NAMED`
**NON-CLAIM:** HOLD ≠ executed prune; P6 inventory ≠ quarantine; gate ≠ budget bump; this ritual ≠ permission to add vibe schemas.

---

## 1. Purpose

Schemas are **35/35 AT_CEILING** (`COMPLEXITY_BUDGET.json`; R4 `auditComplexityBudgetLock` fail-closed in verify:strict). P6 published a ranked engine/island CANDIDATE inventory (inventory only). T6 adds the **operator standing order + gate** so complexity pressure cannot be ignored:

1. Either document an explicit **HOLD** ("hold AT_CEILING; no new schemas"), **or**
2. Supply a **PO_NAMED** list (exact schema/engine paths ⊆ P6 CANDIDATE set or PO-named schema JSON) and pass budget recount / locks before any prune.

Silent prune / vibe new `docs/schemas/**/*.json` / unnamed quarantine are **FORBIDDEN**.

---

## 2. Legal modes

### 2.1 HOLD (default / standing order when PO has not named paths)

- Evidence note must state: **HOLD — hold AT_CEILING; no new schemas** (or equivalent standing order).
- `COMPLEXITY_BUDGET.status` remains **AT_CEILING** (35/35); R4 complexity-budget-lock green.
- P6 inventory unchanged; CANDIDATES remain inventory-only.
- Gate CLI: `node scripts/ci/complexity-ceiling-hold-gate.js` → mode HOLD PASS.
- New schema JSON under `docs/schemas/` is **FORBIDDEN** while AT_CEILING unless PO raises `max_schemas` or prunes in a named change set.

### 2.2 PO_NAMED (only after PO supplies exact paths)

1. PO publishes exact schema and/or engine paths (must be ⊆ P6 ranked CANDIDATE set for engines, or explicit schema JSON paths with PO evidence).
2. Run gate with `--names path.a,path.b` — fail-closed if empty or unknown (not in P6 CANDIDATE set).
3. Budget recount plan: prune/quarantine only named paths; update `COMPLEXITY_BUDGET.json` honesty (`current_usage` / `status`); R4 lock must go green.
4. No silent prune: every removed path appears in the PO list + evidence release note.
5. Follow-up ladder step / HITL merge — **not** implied by this runbook alone.

---

## 3. Verify / budget gate

| Check | HOLD | PO_NAMED (pre-prune) |
| --- | --- | --- |
| R4 `auditComplexityBudgetLock` | must PASS (AT_CEILING 35/35) | must PASS after planned edits |
| P6 `auditP6InventoryLock` | must PASS | must PASS / inventory updated in same change |
| T6 `auditComplexityCeilingHoldLock` | HOLD standing-order language present | PO_NAMED list present + names ⊆ P6 CANDIDATE |
| Vibe / silent new schemas | FORBIDDEN | FORBIDDEN |
| Silent engine prune | FORBIDDEN | FORBIDDEN |

---

## 4. Operator commands

```bash
npm run test:t6
node scripts/ci/complexity-ceiling-hold-gate.js
node scripts/ci/complexity-ceiling-hold-gate.js --names src/core/pilot/one_percent/mini-bytecode-vm-engine.js
npm run test:r4
npm run test:p6
```

Gate is **NON-MUTATING** (observational). It never deletes schemas/engines or rewrites COMPLEXITY_BUDGET.json.

---

## 5. Non-claims

- Ritual / gate ≠ executed prune / quarantine.
- HOLD ≠ permission to prune later without a new PO-named change set.
- P6 inventory ≠ quarantine.
- R4 gate green under HOLD does not imply PRODUCTION_READY.
- Budget bump (`max_schemas`) requires explicit PO — not this ritual alone.
- Antigravity-first: no Cursor CloudAgent as SpecBoot default.
- PRODUCTION_READY remains **NO**.
