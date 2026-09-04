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
