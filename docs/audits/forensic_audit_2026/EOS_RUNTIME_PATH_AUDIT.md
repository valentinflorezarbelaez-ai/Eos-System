# EOS RUNTIME PATH AUDIT & ENTRYPOINT TRACING
**Document ID:** `AUD-EOS-RUNTIME-PATH-2026`  
**Standard:** AST Execution Tracing & Dynamic Path Analysis  

---

## 1. Entrypoint Inventory & Canonicality

| Entrypoint | Implementation Target | State Store | Canonical? | Role / Status |
|---|---|---|---|---|
| `bin/eos.js` | `src/cli/mission-cli.js` $\rightarrow$ `MissionRuntime` | `.missions/<id>/` | **YES (CLI)** | Production CLI entrypoint for Human Director |
| `src/mcp-server.js` | `EosMcpServer` $\rightarrow$ Bridge + Native Engines | Mixed (`.missions/` + in-memory `Map()`) | **YES (MCP)** | JSON-RPC 2.0 stdio server for IDEs/agents (44 tools) |
| `scripts/cli/eos.js` | Legacy CLI dispatcher | Legacy paths | **NO (LEGACY)** | Deprecated compatibility shim (`npm run eos:legacy`) |
| `scripts/verify-eos.js` | Static AST & Invariant engine | Read-only | **YES (CI/VERIFY)** | Deterministic 482-check verification engine |
| `src/core/kernel.js` | Kernel bootstrap & Tribunal | Ephemeral | **SUPPORTING** | Kernel diagnostic and assertion runner |

---

## 2. Real vs. Documented Execution Paths

```text
[DOCUMENTED CLAIM]: Single unified pipeline transforming Intent -> Architecture -> Code -> Evidence -> Close.

[ACTUAL REALITY]:
Path A (CLI / MCP Mission Tools):
Intent -> MissionRuntime.createMission() -> .missions/<id>/ -> AuthorityTruthSource (8 States)

Path B (MCP Orchestrator Tools):
Intent -> EOSMissionOrchestrator.initiateOctavePipeline() -> in-memory activeMissions Map -> 7 Temples

PATH A != PATH B (They do not share state).
```
