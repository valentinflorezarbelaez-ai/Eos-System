# EOS State Ownership & Authority Matrix
## Single Sources of Truth Across Operational Domains
**Document ID:** `EOS-STATE-MATRIX-001`

---

### Domain State Ownership Table

| State Domain | Canonical Source of Truth | Secondary / Derived View | Split-Brain Risk | Remediation Rule |
|---|---|---|---|---|
| **Mission Lifecycle & FSM** | `EOSOrchestrator` (`src/core/orchestrator.js`) | `.missions/<id>/mission-package.json` | HIGH (Parallel `MissionRuntime`) | Unify lifecycle into `EOSOrchestrator`; use filesystem solely as persistent storage. |
| **Authority & Autonomy Ranks** | `AuthorityAdapter` (`src/core/authority/authority-adapter.js`) | `process.env.EOS_AUTONOMY_LEVEL` | LOW | Monotonic rank arithmetic verified on every call. |
| **Evidence & Test Receipts** | Physical JSON files in `.missions/<id>/evidence/` | In-memory receipt objects | MEDIUM (Hash generated without disk write) | Disallow phase transition unless physical `EVD-*.json` exists with Exit Code 0. |
| **Ledger & Audit Trail** | `EOSKernel` Ledger Store (`src/core/kernel.js`) | In-memory transaction hashes | LOW | Append-only ledger format with SHA-256 chain. |
| **Constitutional Baselines** | `CONSTITUTION.md` & `.cursorrules` (SHA-256) | `EOSDriftDetector` baseline map | LOW | Drift detector calculates disk hashes dynamically. |
| **Knowledge Graph** | `EOSKnowledgeOntology` (`src/core/knowledge-ontology.js`) | Node relationships array | LOW | In-memory graph verified by `EOSFDIROntology`. |
