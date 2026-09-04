# EOS MCP Tool Capability Matrix (Canonical 20-Tool Audit)

**Subsystem:** EOS MCP stdio Server (`src/mcp-server.js`)  
**Protocol:** JSON-RPC 2.0 / MCP stdio (Protocol version `2024-11-05`)  
**Audit Standard:** Strict separation between active runtime handlers and simulation stubs.

---

## 1. Granular Capability Matrix (All 20 Canonical Tools)

| Tool ID | Manifest Declaration | Dispatcher Route | Implementation Path | Runtime Reachable | Side-Effect Class | Authority Required | Evidence Status | Real Test Coverage | Protected Surfaces | Failure / Escalation Behavior |
|---|---|---|---|---|---|---|---|---|---|---|
| `eos.context.compile` | Compile token-budgeted prompt context with receipts | `switch(name) -> case 'eos.context.compile'` | `scripts/engine/context-compiler.js` | **YES** | `READ_ONLY` | `A0` (Level 0) | `VERIFIED_IMPLEMENTED` | `tests/context-compiler.test.js`, `tests/mcp-readonly-guard.test.js` | Read-only file inspection; no file writes | Returns `DENIED` if governance guard fails; throws on invalid args |
| `eos.ledger.get_features` | Get feature list and task DoD status | `switch(name) -> case 'eos.ledger.get_features'` | `scripts/engine/mission-ledger.js` | **YES** | `READ_ONLY` | `A0` (Level 0) | `VERIFIED_IMPLEMENTED` | `tests/mission-ledger.test.js`, `tests/mcp-readonly-guard.test.js` | Reads `.eos/ledger/` | Returns `null` if missionId missing; returns `DENIED` if guarded |
| `eos.ledger.update_feature` | Update feature status with evidence receipt | `switch(name) -> case 'eos.ledger.update_feature'` | `scripts/engine/mission-ledger.js` | **YES** | `LEDGER_WRITE` | `A1` (Level 1) | `VERIFIED_IMPLEMENTED` | `tests/mission-ledger.test.js`, `tests/mcp-readonly-guard.test.js` | `.eos/ledger/`; requires attached evidence for `VERIFIED` | Throws if `VERIFIED` without receipt; returns `DENIED` in read-only mode |
| `eos.authority.check` | Check monotonic authority permissions and gates | `switch(name) -> case 'eos.authority.check'` | `scripts/engine/authority-adapter.js` | **YES** | `READ_ONLY` | `A0` (Level 0) | `VERIFIED_IMPLEMENTED` | `tests/authority-adapter.test.js`, `tests/mcp-readonly-guard.test.js` | Pure computation | Returns structured `{ authorized: false, reason: '...' }` |
| `eos.mission.recover` | Recover mission state from append-only ledger | `switch(name) -> case 'eos.mission.recover'` | `scripts/engine/mission-ledger.js` | **YES** | `LEDGER_WRITE` | `A1` (Level 1) | `VERIFIED_IMPLEMENTED` | `tests/mission-ledger.test.js`, `tests/mcp-readonly-guard.test.js` | `.eos/ledger/run_log_*.jsonl` | Throws if log does not exist; returns `DENIED` in read-only mode |
| `eos.mission.resolve` | Resolve raw intent into structured mission DAG | `switch(name) -> default` | None (Simulation Stub) | **NO** | `NONE` | `A0` (Level 0) | `SIMULATION_ONLY` | `tests/mcp-readonly-guard.test.js` | Read-only intent resolution | Returns `status: 'SIMULATION_ONLY'`, `executed: false` |
| `eos.mission.start` | Initialize and start a mission | `switch(name) -> default` | None (Simulation Stub) | **NO** | `LEDGER_WRITE` | `A1` (Level 1) | `SIMULATION_ONLY` | `tests/mcp-readonly-guard.test.js` | `.eos/ledger/` | Returns `DENIED` in read-only mode, or `SIMULATION_ONLY` |
| `eos.mission.status` | Get current mission status and telemetry | `switch(name) -> default` | None (Simulation Stub) | **NO** | `READ_ONLY` | `A0` (Level 0) | `SIMULATION_ONLY` | `tests/mcp-readonly-guard.test.js` | Read-only | Returns `status: 'SIMULATION_ONLY'`, `executed: false` |
| `eos.policy.validate` | Validate operation against policy engine | `switch(name) -> default` | None (Simulation Stub) | **NO** | `READ_ONLY` | `A0` (Level 0) | `SIMULATION_ONLY` | `tests/mcp-readonly-guard.test.js` | Read-only policies | Returns `status: 'SIMULATION_ONLY'`, `executed: false` |
| `eos.evidence.record` | Record immutable evidence receipt with SHA-256 | `switch(name) -> default` | Kernel exists in `src/core/sdd/` (Unwired in MCP) | **NO** | `LEDGER_WRITE` | `A1` (Level 1) | `SIMULATION_ONLY` | `tests/mcp-readonly-guard.test.js`, `tests/sdd-evidence-engine.test.js` | Evidence store | Returns `DENIED` in read-only mode, or `SIMULATION_ONLY` |
| `eos.evidence.get` | Retrieve verified evidence receipt by ID | `switch(name) -> default` | None (Simulation Stub) | **NO** | `READ_ONLY` | `A0` (Level 0) | `SIMULATION_ONLY` | `tests/mcp-readonly-guard.test.js` | Evidence store | Returns `status: 'SIMULATION_ONLY'`, `executed: false` |
| `eos.verifier.run` | Run strict governance and schema verification | `switch(name) -> default` | Script in `scripts/verify-eos.js` (Unwired in MCP) | **NO** | `READ_ONLY` | `A0` (Level 0) | `SIMULATION_ONLY` | `tests/mcp-readonly-guard.test.js` | Read-only audit | Returns `status: 'SIMULATION_ONLY'`, `executed: false` |
| `eos.provider.route` | Route prompt or task to optimal model/provider | `switch(name) -> default` | None (Simulation Stub) | **NO** | `READ_ONLY` | `A0` (Level 0) | `SIMULATION_ONLY` | `tests/mcp-readonly-guard.test.js` | Read-only routing | Returns `status: 'SIMULATION_ONLY'`, `executed: false` |
| `eos.provider.health` | Get latency, health and error rate for providers | `switch(name) -> default` | None (Simulation Stub) | **NO** | `READ_ONLY` | `A0` (Level 0) | `SIMULATION_ONLY` | `tests/mcp-readonly-guard.test.js` | Read-only telemetry | Returns `status: 'SIMULATION_ONLY'`, `executed: false` |
| `eos.workspace.discover` | Inspect workspace files, dependencies and git state | `switch(name) -> default` | None (Simulation Stub) | **NO** | `READ_ONLY` | `A0` (Level 0) | `SIMULATION_ONLY` | `tests/mcp-readonly-guard.test.js` | Workspace read-only | Returns `status: 'SIMULATION_ONLY'`, `executed: false` |
| `eos.workspace.barrier_check`| Enforce write barrier against external paths | `switch(name) -> default` | Logic in `verify-eos.js` (Unwired in MCP) | **NO** | `READ_ONLY` | `A0` (Level 0) | `SIMULATION_ONLY` | `tests/mcp-readonly-guard.test.js` | External targets | Returns `status: 'SIMULATION_ONLY'`, `executed: false` |
| `eos.fdir.status` | Get current FDIR health state and safe mode | `switch(name) -> default` | None (Simulation Stub) | **NO** | `READ_ONLY` | `A0` (Level 0) | `SIMULATION_ONLY` | `tests/mcp-readonly-guard.test.js` | Reliability health | Returns `status: 'SIMULATION_ONLY'`, `executed: false` |
| `eos.fdir.trip` | Trip safe mode breaker to halt mutating operations | `switch(name) -> default` | None (Simulation Stub) | **NO** | `NONE` | `A2` (Level 2) | `SIMULATION_ONLY` | `tests/mcp-readonly-guard.test.js` | FDIR breaker state | Returns `status: 'SIMULATION_ONLY'`, `executed: false` |
| `eos.audit.run` | Run complete 21-step compliance audit | `switch(name) -> default` | None (Simulation Stub) | **NO** | `READ_ONLY` | `A0` (Level 0) | `SIMULATION_ONLY` | `tests/mcp-readonly-guard.test.js` | Read-only compliance | Returns `status: 'SIMULATION_ONLY'`, `executed: false` |
| `eos.report.generate` | Generate executive mission summary report | `switch(name) -> default` | None (Simulation Stub) | **NO** | `READ_ONLY` | `A0` (Level 0) | `SIMULATION_ONLY` | `tests/mcp-readonly-guard.test.js` | Read-only reports | Returns `status: 'SIMULATION_ONLY'`, `executed: false` |

---

## 2. Summary Statistics

- **Total Canonical Tools Declared:** 20
- **Active Runtime Handlers (`VERIFIED_IMPLEMENTED`):** 5 (25%)
- **Explicit Simulation Stubs (`SIMULATION_ONLY`):** 15 (75%)
- **Default-Deny Governance Guard:** Active on 100% of tool invocations via `evaluateToolGuard()`.
- **Side-Effect Distribution:**
  - `READ_ONLY`: 14 tools
  - `LEDGER_WRITE`: 4 tools (`eos.mission.start`, `eos.mission.recover`, `eos.ledger.update_feature`, `eos.evidence.record`)
  - `NONE`: 2 tools (`eos.mission.resolve`, `eos.fdir.trip`)
  - `EXTERNAL_WRITE`: 0 tools
