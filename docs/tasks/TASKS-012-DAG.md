# TASKS-012: Atomic Task DAG — EOS Unified Sovereign Control Hub & Native MCP Gateway

* **Status:** TASKS_APPROVED
* **Author:** Lead Systems Architect & Valentin Florez
* **Specification:** [SPEC-012](file:///c:/Users/valen/Eos-System-1/docs/specs/SPEC-012-EOS-UNIFIED-CONTROL-HUB-AND-MCP-GATEWAY.md)

---

## Atomic Task Dependency Graph

```text
TASK-012-01 (Domain & App Bridges)
       │
       ▼
TASK-012-02 (Native MCP Server: src/mcp/eosMcpServer.ts)
       │
       ▼
TASK-012-03 (Interactive Sacred Dashboard: public/index.html)
       │
       ▼
TASK-012-04 (Lightweight Dashboard Server: scripts/serve-dashboard.mjs)
       │
       ▼
TASK-012-05 (Strict Invariant I & scripts/verify-strict.ps1)
       │
       ▼
TASK-012-06 (Build, Test & Cryptographic Evidence Seal)
```

---

## Detailed Task Breakdown

### TASK-012-01: MCP Protocol & Application Handlers Integration
* **File:** `src/mcp/eosMcpServer.ts`
* **Done Criteria:** Handlers implemented for `eos_health_check`, `eos_reconcile_state`, `eos_titans_benchmark`, `eos_audit_fleet`, `eos_evaluate_decision`, `eos_estimate_project`, `eos_generate_sacred_media`, `eos_autonomous_heal`, and `eos_turbo_verify`.

### TASK-012-02: Native Stdio MCP Server Loop
* **File:** `src/mcp/eosMcpServer.ts`
* **Done Criteria:** JSON-RPC 2.0 stdio stream parser handles `initialize`, `tools/list`, and `tools/call`. Desired-state reconciliation evaluates `docs/projects/registry.json` and returns 0.00% drift.

### TASK-012-03: Interactive Sacred Control Dashboard
* **File:** `public/index.html`
* **Done Criteria:** Real-time 60 FPS HTML5 Canvas Cymatics visualizer, interactive PERT slider calculator with live hours/cost curves, multi-agent deliberation cards with real-time veto toggle, and live sovereign fleet matrix.

### TASK-012-04: Lightweight Local Dashboard Server
* **File:** `scripts/serve-dashboard.mjs`
* **Done Criteria:** Zero-dependency HTTP static file server on port 3300 serving `public/index.html` with graceful shutdown and CLI launch command `npm run dashboard`.

### TASK-012-05: Invariant I Integration in Verification Suite
* **File:** `scripts/verify-strict.ps1`
* **Done Criteria:** Invariant I tests MCP tool registry, Borg 0.00% reconciliation, and dashboard asset presence.

### TASK-012-06: Verification & Cryptographic Ledger Evidence
* **Action:** Run `npm run build` (`tsc`) and `npm test` (`scripts/verify-strict.ps1`).
* **Done Criteria:** Exit Code 0 across all 6 stages. Clean logs, 0 linter errors, updated evidence ledger.
