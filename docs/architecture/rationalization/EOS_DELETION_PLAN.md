# EOS Deletion & Quarantine Plan
**Document ID:** DEL-PLAN-001  
**Classification:** REVERSIBLE_QUARANTINE  

---

## 1. Non-Destructive Quarantine Policy

No file is deleted directly. All candidates for retirement are moved to `archive/quarantine/` with a cryptographic manifest.

### Quarantine Candidates

| Artifact | Reason | Replacement | Quarantine Action |
|---|---|---|---|
| `scripts/engine/epistemic-evidence-engine.js` | Exact duplicate of `src/core/sdd/epistemic-evidence-engine.js` | `src/core/sdd/epistemic-evidence-engine.js` | Move to `archive/quarantine/` |
| `scripts/engine/hitl-gatekeeper.js` | Exact duplicate of `src/core/sdd/hitl-gatekeeper.js` | `src/core/sdd/hitl-gatekeeper.js` | Move to `archive/quarantine/` |
| `scripts/engine/sdd-fsm-engine.js` | Exact duplicate of `src/core/sdd/sdd-fsm-engine.js` | `src/core/sdd/sdd-fsm-engine.js` | Move to `archive/quarantine/` |
| `scripts/cli/eos.js` | Deprecated split-brain CLI | `bin/eos.js` | Move to `archive/quarantine/` |


---

## 2. ROI2 Engine Prune (2026-09-08)

**Document addendum:** DEL-PLAN-001 / ROI2  
**Action:** REVERSIBLE_QUARANTINE of 80 `scripts/engine` research/canary modules + 88 companion tests.

| Location | Contents |
|---|---|
| `archive/quarantine/engine-roi2/scripts-engine/` | 80 engines |
| `archive/quarantine/engine-roi2/tests/` | 88 tests |
| `archive/quarantine/engine-roi2/INVENTORY.json` | Machine-readable keep/archive lists |
| `docs/releases/ROI2_ENGINE_PRUNE_2026-09-08.md` | Release evidence |

Canonical keep set (19) remains under `scripts/engine/` — locked by `tests/engine-roi2-canonical-inventory.test.js`.
