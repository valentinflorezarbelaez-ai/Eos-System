# EOS Architecture Rationale & First-Principles Justification
**Document ID:** ARCH-RATIONALE-001  
**Author:** Chief Architect / Repository Steward  

---

## 1. First-Principles Engineering Justification

### Rationale 1: Why Consolidate into `src/core/`?
In earlier development iterations, standalone scripts in `scripts/engine/` were useful for proving individual algorithms in isolation. However, having production code in `src/` and partially overlapping engines in `scripts/` created architectural confusion. Consolidating all production capabilities into `src/core/` provides a single source of truth, enabling clear static analysis and deterministic testing.

### Rationale 2: Why Route All MCP Calls Through `McpMissionBridge`?
AI IDE agents (Cursor, Windsurf, Antigravity) interact with EOS exclusively via MCP stdio. If the MCP server calls legacy un-governed scripts, the entire ATS authority model and SDD FSM transition enforcer are bypassed. Routing all MCP tools through `McpMissionBridge` guarantees that every tool invocation is strictly guarded by the authority matrix and recorded in the hash-chained ledger.

### Rationale 3: Why Strict Separation of Lab vs Core?
Projects inside `EOS-Lab/` (like `FlowDesk`) are experimental target applications. They must never be mixed with the control plane itself. Clear boundary rules ensure that tests running on FlowDesk cannot inadvertently alter the control plane.
