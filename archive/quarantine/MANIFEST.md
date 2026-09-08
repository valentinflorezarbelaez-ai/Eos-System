# Quarantine manifest — Mission OS slim (DEL-PLAN-001)

**Date:** 2026-09-04  
**Action:** `REVERSIBLE_QUARANTINE` (moved, not deleted)

| Artifact | From | Reason | Replacement |
|---|---|---|---|
| `epistemic-evidence-engine.js` | `scripts/engine/epistemic-evidence-engine.js` | Duplicate stub of canonical SDD engine | `src/core/sdd/epistemic-evidence-engine.js` |
| `hitl-gatekeeper.js` | `scripts/engine/hitl-gatekeeper.js` | Duplicate stub of canonical HITL gate | `src/core/sdd/hitl-gatekeeper.js` |
| `sdd-fsm-engine.js` | `scripts/engine/sdd-fsm-engine.js` | Duplicate stub of canonical FSM | `src/core/sdd/sdd-fsm-engine.js` |

Restore by moving these files back to `scripts/engine/` if a consumer still needs the legacy stub path. `src/` must not import these paths.


---

## ROI2 engine prune (2026-09-08)

See `archive/quarantine/engine-roi2/MANIFEST.md` and `INVENTORY.json`.

80 research/canary engines + 88 companion tests moved from `scripts/engine/` / `tests/` (reversible). Canonical keep set: 19 files.
