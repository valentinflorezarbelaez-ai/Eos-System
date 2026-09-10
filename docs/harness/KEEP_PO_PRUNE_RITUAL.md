# KEEP PO-named prune ritual (gate / process)

**Status:** ACTIVE runbook (Ladder 8 T5 / K4)
**PRODUCTION_READY:** NO
**Modes:** `HOLD` | `PO_NAMED`
**NON-CLAIM:** inventory ≠ silent delete; this ritual ≠ executed prune until PO names exact tools and a follow-up change set performs catalog reconcile + delete under HITL.

---

## 1. Purpose

S5 published KEEP 57 / CANDIDATE 23 (inventory only). T5 adds the **operator gate** so prune cannot happen silently:

1. Either document an explicit **HOLD** ("no prune this quarter"), **or**
2. Supply a **PO_NAMED** list (exact tool names ⊆ S5 CANDIDATE set) and pass catalog reconcile before any deletion.

Silent delete / vibe prune / unnamed catalog edits are **FORBIDDEN**.

---

## 2. Legal modes

### 2.1 HOLD (default when PO has not named tools)

- Evidence note must state: **HOLD — no prune this quarter** (or equivalent).
- Catalog remains `80 == CANONICAL_TOOLS` (P5 mcp-catalog-lock green).
- S5 KEEP inventory unchanged; CANDIDATES remain inventory-only.
- Gate CLI: `node scripts/ci/keep-po-prune-gate.js` → mode HOLD PASS.

### 2.2 PO_NAMED (only after PO supplies exact names)

1. PO publishes exact tool names (must be ⊆ S5 ranked CANDIDATE set).
2. Run gate with `--names tool.a,tool.b` — fail-closed if empty, unknown, or KEEP-set collision.
3. Catalog reconcile plan (P5 pattern): update `EOS_MCP_TOOL_CATALOG.json` + live `CANONICAL_TOOLS` in the **same** change set; `auditMcpCatalogLock` must go green.
4. No silent delete: every removed name appears in the PO list + evidence release note.
5. Follow-up ladder step / HITL merge — **not** implied by this runbook alone.

---

## 3. Catalog reconcile gate

| Check | HOLD | PO_NAMED (pre-delete) |
| --- | --- | --- |
| `auditMcpCatalogLock` | must PASS (80==80) | must PASS after planned edits |
| S5 `auditMcpToolKeepLock` | must PASS | must PASS / inventory updated in same change |
| T5 `auditKeepPoPruneHoldLock` | HOLD language present | PO_NAMED list present + names ⊆ CANDIDATE |
| Silent delete | FORBIDDEN | FORBIDDEN |

---

## 4. Operator commands

```bash
npm run test:t5
node scripts/ci/keep-po-prune-gate.js
node scripts/ci/keep-po-prune-gate.js --names eos.provider.health
npm run test:s5
npm run test:p5
```

Gate is **NON-MUTATING** (observational). It never deletes tools or rewrites the catalog.

---

## 5. Non-claims

- Ritual / gate ≠ executed prune.
- HOLD ≠ permission to delete later without a new PO-named change set.
- Inventory (S5) ≠ silent delete.
- Catalog reconcile green under HOLD does not imply PRODUCTION_READY.
- Antigravity-first: no Cursor CloudAgent as SpecBoot default.
- PRODUCTION_READY remains **NO**.
