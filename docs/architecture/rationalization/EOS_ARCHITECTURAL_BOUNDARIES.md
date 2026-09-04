# EOS Architectural Boundaries & Boundary Enforcement
**Document ID:** ARCH-BOUNDARIES-001  
**Classification:** CANONICAL_GOVERNANCE  

---

## 1. Domain Boundaries

| Layer / Domain | Canonical Location | Allowed Inward Dependencies | Forbidden Inward Dependencies |
|---|---|---|---|
| **Entrypoints** | `bin/`, `src/mcp-server.js` | `src/cli/`, `src/core/mcp/` | Directly modifying internal database, bypass ATS |
| **CLI Implementation** | `src/cli/` | `src/core/runtime/` | `scripts/engine/*` legacy files |
| **Mission Core Kernel** | `src/core/` | Node built-ins, standard core modules | `scripts/`, `EOS-Lab/`, `Fundacion/` |
| **Agent Platforms** | `.agents/`, `.cursor/`, `.windsurf/` | Standard rule syntax, MCP configs | Hardcoded local absolute paths |
| **Lab Sandboxes** | `EOS-Lab/` | Local sandbox packages | Mutating control-plane core |
| **Protected Targets** | `Fundacion/` | Read-only discovery | ANY write or mutation without L3 authority |

---

## 2. Dependency Invariants

1. **Core Independence:** `src/core/` must never import from `scripts/`, `tests/`, or `docs/`.
2. **Zero Split-Brain Imports:** No module in `src/` may import duplicated legacy engines from `scripts/engine/`.
3. **Write Barrier Invariant:** All file mutations outside `.missions/`, `.eos/`, and `EOS-MISSION-CONTROL/` must pass through `IntegrationGatekeeper.validateBarrier()`.
