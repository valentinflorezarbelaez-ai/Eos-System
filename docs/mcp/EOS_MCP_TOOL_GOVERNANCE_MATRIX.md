# EOS MCP Tool Governance & Capability Matrix
## Comprehensive Architectural Audit of the 80 Exposed Tools in `eos-local`

---

### Executive Summary

An exhaustive forensic and architectural capability audit was conducted across the **80 tools** registered in `CANONICAL_TOOLS` within `src/mcp-server.js` for the `eos-local` MCP server.

| Metric | Measured Value | Architectural Finding |
|---|---|---|
| **Total Exposed Tools** | **80** | Defined in `CANONICAL_TOOLS` and dispatched via JSON-RPC stdio |
| **Canonical Operational Tools** | **57 (71.3%)** | Real implementations connected to Kernel, MissionRuntime, AST parsers, or FDIR |
| **Simulation / Theatrical Tools** | **22 (27.5%)** | Mock handlers returning generated SHA-256 hashes without physical execution |
| **Legacy / Stubbed Tools** | **1 (1.3%)** | Hardcoded `NOT_CONFIGURED` return envelope (`eos.provider.health`) |
| **Critical Path Tools** | **19 (25.7%)** | Essential minimal toolset for the Spec-Driven Development (SDD) Golden Path |
| **Directly Connected to MissionRuntime** | **19 (25.7%)** | Wires directly through `McpMissionBridge` into `MissionRuntime` |
| **Tools with Real Policy Enforcement** | **51 (68.9%)** | Protected by `evaluateToolGuard` (mode, autonomy rank, side-effects) and real schema logic |
| **Tools with Theatrical / Mock Enforcement** | **23 (31.1%)** | Merely check flag values or string prefixes before returning pre-canned receipts |
| **Capability Redundancy Clusters** | **8 clusters** | Functional overlap in evidence recording, mission init, scaffolding, and status |
| **Unregistered Switch Cases (Dead Code)** | **2 tools** | `eos.audit.parallel_dag.run` & `eos.governance.tier.classify` exist in switch but are blocked by `handleToolCall` |

---

### The 16 Classification Groups

The 80 tools have been classified into the 16 architectural groups based on operational domain and true capability:

```
1. CORE_OPERATIONAL (16 Tools):
   - eos.kernel.boot
   - eos.policy.validate
   - eos.fdir.status
   - eos.fdir.trip
   - eos.fdir.recover
   - eos.fdir.ontology.sanitize
   - eos.sentinel.toggle
   - eos.resolve.conflict
   - eos.audit.run
   - eos.process.governor.validate
   - eos.ontology.query
   - eos.ontology.link
   - eos.drift.check
   - eos.drift.detect
   - eos.sentinel.self_remember
   - eos.justice.adjudicate

2. MISSION (10 Tools):
   - eos.mission.resolve
   - eos.intent.expand
   - eos.mission.start
   - eos.mission.status
   - eos.mission.recover
   - eos.report.generate
   - eos.orchestrator.init
   - eos.orchestrator.advance
   - eos.orchestrator.rollback
   - eos.net.logos.resonance_check

3. AUTHORITY (1 Tool):
   - eos.authority.check

4. EVIDENCE (3 Tools):
   - eos.kernel.evidence
   - eos.evidence.record
   - eos.evidence.get

5. LEDGER (4 Tools):
   - eos.kernel.ledger
   - eos.ledger.get_features
   - eos.ledger.update_feature
   - eos.ledger.octave.advance

6. WORKSPACE (5 Tools):
   - eos.context.compile
   - eos.workspace.discover
   - eos.workspace.barrier_check
   - eos.hud.dashboard
   - eos.skill.route

7. ENGINEERING (7 Tools):
   - eos.blueprint.run
   - eos.scaffolder.generate
   - eos.scaffolder.clean
   - eos.scaffolder.execute
   - eos.core.triamazikamno.validate
   - eos.core.triamazikamno.synthesize
   - eos.compiler.l0.parse

8. SECURITY (5 Tools):
   - eos.verifier.run
   - eos.audit.tescohan.scan
   - eos.audit.ahimsa.verify
   - eos.ontological.firewall.inspect
   - eos.security.adversarial.review

9. PROVIDERS (2 Tools):
   - eos.provider.route
   - eos.provider.health

10. SIMULATION (21 Tools):
    - eos.pleroma.jubilee
    - eos.pleroma.kundalini.mirror
    - eos.pleroma.mercabah.crystallize
    - eos.pleroma.elemental.intercede
    - eos.net.trogomesh.balance
    - eos.pleroma.amens.audit
    - eos.pleroma.jeu.watch
    - eos.audit.tescohan.telescope
    - eos.pleroma.system.mahapralaya
    - eos.pleroma.anupadaka.shield
    - eos.audit.telemetry.stream
    - eos.pleroma.moses.transmute
    - eos.pleroma.zodiac.shield
    - eos.pleroma.auxiliary.state
    - eos.pleroma.trees.anchor
    - eos.pleroma.anupadaka.fuse
    - eos.pleroma.voices.modulate
    - eos.pleroma.melchizedek.govern
    - eos.environment.sandbox.execute
    - eos.sdlc.engineer.autonomous
    - eos.pleroma.akasha.engram

11-16. FSM, HITL, MEMORY, EXPERIMENTAL, LEGACY, UNKNOWN:
   - FSM / HITL mechanisms are integrated as cross-cutting invariants in MISSION and AUTHORITY.
   - LEGACY: eos.provider.health (1 tool).
   - EXPERIMENTAL: Tracked in EOS_MCP_EXPERIMENTAL_REGISTER.json.
```

---

### Special Investigation: The `eos.pleroma.*` Namespace

#### 1. Genesis and Intention
The 16 tools prefixed with `eos.pleroma.*` (alongside sibling simulation tools like `eos.sdlc.engineer.autonomous`, `eos.environment.sandbox.execute`, `eos.security.adversarial.review`, and `eos.pleroma.akasha.engram`) were created during rapid conceptual evolution as high-level philosophical and esoteric domain abstractions. They represent aspirational architecture (e.g. quantum lattice attestation, Jinas phase shifting, Mercabah seed crystallization, gVisor microVM execution, MCTS closed-loop engineering, SQLite FTS5 lexical persistence).

#### 2. Architectural Reality vs Documentation Claims
When inspecting the concrete code inside `src/mcp-server.js`, every single `eos.pleroma.*` handler is a **pure in-memory theatrical simulation**:
- **Zero External Subprocesses**: `eos.environment.sandbox.execute` does not launch Docker, gVisor, or WASM microVMs. It validates a boolean flag (`efhemeralContainerActive === true`) and returns hardcoded stdout with `exitCode: 0`.
- **Zero AST Dynamic Refinement**: `eos.pleroma.moses.transmute` does not compile bytecode or diamond ASTs. It checks `zeroGarbagePauses === true` and returns a mock receipt.
- **Zero Database Persistence**: `eos.pleroma.akasha.engram` does not interact with SQLite FTS5 or Engram MCP. It formats an in-memory object and hashes it with Node's `crypto.createHash('sha256')`.
- **Zero Static Security Analysis**: `eos.security.adversarial.review` does not execute CodeQL, Semgrep, or AST linters. It runs `diffPayload.includes('TODO')` and returns a mock clean bill of health.
- **Zero MCTS or CDP Automation**: `eos.sdlc.engineer.autonomous` returns a hardcoded string `"Tests passed: 243/243. Zero regressions detected."` without executing tests or Chrome DevTools.

#### 3. Operational Risk to LLM Agents
Exposing 22 simulation tools alongside 51 operational tools creates severe architectural hazards:
1. **Prompt & Context Bloat**: Over 30% of the MCP tool definition tokens in the system prompt are consumed by fictitious capabilities.
2. **Hallucinated Assurance**: An autonomous agent invoking `eos.security.adversarial.review` or `eos.environment.sandbox.execute` will receive a "CONSECRATED_SUCCESS" receipt and assume the code was executed in a secure sandbox with 0 vulnerabilities, when in reality no execution took place.
3. **Cognitive Distraction**: Agents struggle to distinguish between the real SDD engineering workflow (`eos.scaffolder.execute`, `eos.evidence.record`, `eos.verifier.run`) and symbolic abstractions.

---

### Master 80-Tool Governance Table

| # | Tool Name | Group | Class | Auth | Side Effects | Real Implementation Owner | Risk | Runtime Status |
|---|---|---|---|---|---|---|---|---|
| 1 | `eos.kernel.boot` | CORE_OPERATIONAL | Canonical | A0 | Read-Only | `src/core/kernel.js` | **LOW** | Active in CI & CLI boot sequence |
| 2 | `eos.kernel.ledger` | LEDGER | Canonical | A1 | Ledger-Write | `src/core/kernel.js` | **MEDIUM** | Active in Kernel state changes and tests |
| 3 | `eos.kernel.evidence` | EVIDENCE | Canonical | A1 | Ledger-Write | `src/core/kernel.js` | **LOW** | Active in kernel test suites |
| 4 | `eos.mission.resolve` | MISSION | Canonical | A0 | Read-Only | `src/core/mcp/mcp-mission-bridge.js` | **LOW** | Active in Mission bridge & CLI |
| 5 | `eos.intent.expand` | MISSION | Canonical | A0 | Read-Only | `src/core/intent-compiler.js` | **LOW** | Active in Intent Compiler test suites |
| 6 | `eos.mission.start` | MISSION | Canonical | A1 | Write (Local .missions/) | `src/core/mcp/mcp-mission-bridge.js` | **MEDIUM** | Active in MissionRuntime and MCP |
| 7 | `eos.mission.status` | MISSION | Canonical | A0 | Read-Only | `src/core/mcp/mcp-mission-bridge.js` | **LOW** | Active across all test suites and runtime |
| 8 | `eos.mission.recover` | MISSION | Canonical | A1 | Read/Write (State reconstruction) | `src/core/mcp/mcp-mission-bridge.js` | **MEDIUM** | Active in crash-recovery tests |
| 9 | `eos.context.compile` | WORKSPACE | Canonical | A0 | Read-Only | `src/core/runtime/context-compiler.js` | **LOW** | Active in context-compiler tests |
| 10 | `eos.ledger.get_features` | LEDGER | Canonical | A0 | Read-Only | `src/core/mcp/mcp-mission-bridge.js` | **LOW** | Active in ledger tests |
| 11 | `eos.ledger.update_feature` | LEDGER | Canonical | A1 | Ledger-Write | `src/core/mcp/mcp-mission-bridge.js` | **MEDIUM** | Active in ledger tests |
| 12 | `eos.authority.check` | AUTHORITY | Canonical | A0 | Read-Only | `src/core/authority/authority-adapter.js` | **LOW** | Active across all governance tests |
| 13 | `eos.policy.validate` | CORE_OPERATIONAL | Canonical | A0 | Read-Only | `src/core/mcp/mcp-mission-bridge.js` | **LOW** | Active in bridge tests |
| 14 | `eos.evidence.record` | EVIDENCE | Canonical | A1 | Write (Local disk) | `src/mcp-server.js` | **MEDIUM** | Active in evidence test suites |
| 15 | `eos.evidence.get` | EVIDENCE | Canonical | A0 | Read-Only | `src/core/mcp/mcp-mission-bridge.js` | **LOW** | Active in bridge tests |
| 16 | `eos.verifier.run` | SECURITY | Canonical | A0 | Read-Only | `src/core/mcp/mcp-mission-bridge.js` | **LOW** | Active in schema verification tests |
| 17 | `eos.provider.route` | PROVIDERS | Canonical | A0 | Read-Only | `src/core/provider-router.js` | **LOW** | Active in provider-router tests |
| 18 | `eos.provider.health` | PROVIDERS | Legacy | A0 | Read-Only | `src/mcp-server.js` | **LOW** | Dormant (always returns NOT_CONFIGURED) |
| 19 | `eos.workspace.discover` | WORKSPACE | Canonical | A0 | Read-Only | `src/core/mcp/mcp-mission-bridge.js` | **LOW** | Active in discovery and CLI commands |
| 20 | `eos.workspace.barrier_check` | WORKSPACE | Canonical | A0 | Read-Only | `src/core/mcp/mcp-mission-bridge.js` | **LOW** | Active in barrier & negative governance tests |
| 21 | `eos.fdir.status` | CORE_OPERATIONAL | Canonical | A0 | Read-Only | `src/core/mcp/mcp-mission-bridge.js` | **LOW** | Active across FDIR test suites |
| 22 | `eos.fdir.trip` | CORE_OPERATIONAL | Canonical | A2 | Write (In-memory flag) | `src/core/mcp/mcp-mission-bridge.js` | **HIGH** | Active in killswitch & FDIR tests |
| 23 | `eos.fdir.recover` | CORE_OPERATIONAL | Canonical | A1 | Write (File restoration) | `src/core/fdir.js` | **HIGH** | Active in fdir-self-healing tests |
| 24 | `eos.fdir.ontology.sanitize` | CORE_OPERATIONAL | Canonical | A1 | Write (In-memory graph) | `src/core/fdir-ontology.js` | **MEDIUM** | Active in fdir-ontology tests |
| 25 | `eos.sentinel.toggle` | CORE_OPERATIONAL | Canonical | A1 | Write (Background timer/process) | `src/core/sentinel-daemon.js` | **MEDIUM** | Active in sentinel tests |
| 26 | `eos.resolve.conflict` | CORE_OPERATIONAL | Canonical | A0 | Read-Only | `src/core/mediator.js` | **LOW** | Active in mediator tests |
| 27 | `eos.audit.run` | CORE_OPERATIONAL | Canonical | A0 | Read-Only | `src/mcp-server.js` | **LOW** | Active in MCP stdio smoke and audit tests |
| 28 | `eos.report.generate` | MISSION | Canonical | A0 | Read-Only | `src/core/mcp/mcp-mission-bridge.js` | **LOW** | Active in mission reporting tests |
| 29 | `eos.blueprint.run` | ENGINEERING | Canonical | A1 | Ledger-Write | `src/core/blueprints/blueprint-engine.js` | **HIGH** | Active in golden blueprint tests |
| 30 | `eos.scaffolder.generate` | ENGINEERING | Canonical | A0 | Read-Only (Returns file templates array) | `src/core/runtime/scaffolder.js` | **LOW** | Active in scaffolder tests |
| 31 | `eos.scaffolder.clean` | ENGINEERING | Canonical | A1 | Write (Disk creation of specs, tests, domain files) | `src/core/scaffolder-clean.js` | **MEDIUM** | Active in scaffolder-clean tests |
| 32 | `eos.process.governor.validate` | CORE_OPERATIONAL | Canonical | A0 | Read-Only | `src/core/process-governor.js` | **LOW** | Active in process-governor tests |
| 33 | `eos.ontology.query` | CORE_OPERATIONAL | Canonical | A0 | Read-Only | `src/core/knowledge-ontology.js` | **LOW** | Active across ontology tests |
| 34 | `eos.ontology.link` | CORE_OPERATIONAL | Canonical | A1 | Ledger-Write | `src/core/knowledge-ontology.js` | **MEDIUM** | Active in ontology & orchestrator tests |
| 35 | `eos.orchestrator.init` | MISSION | Canonical | A1 | Ledger-Write | `src/core/orchestrator.js` | **HIGH** | Active in orchestrator tests |
| 36 | `eos.orchestrator.advance` | MISSION | Canonical | A1 | Ledger-Write | `src/core/orchestrator.js` | **HIGH** | Active in orchestrator & FSM tests |
| 37 | `eos.drift.check` | CORE_OPERATIONAL | Canonical | A0 | Read-Only | `src/core/drift/drift-monitor.js` | **LOW** | Active in drift tests |
| 38 | `eos.drift.detect` | CORE_OPERATIONAL | Canonical | A0 | Read-Only | `src/core/drift.js` | **LOW** | Active in kernel, sentinel, and drift tests |
| 39 | `eos.hud.dashboard` | WORKSPACE | Canonical | A0 | Read-Only | `src/core/ui/hud.js` | **LOW** | Active in HUD tests |
| 40 | `eos.skill.route` | WORKSPACE | Canonical | A0 | Read-Only | `src/core/routing/skill-router.js` | **LOW** | Active in skill-routing tests |
| 41 | `eos.scaffolder.execute` | ENGINEERING | Canonical | A1 | Write (Code modification & ledger receipt) | `src/core/runtime/tdd-executor.js` | **HIGH** | Active in tdd-executor & auto-healer tests |
| 42 | `eos.orchestrator.rollback` | MISSION | Canonical | A1 | Write (State rollback) | `src/core/runtime/mission-orchestrator.js` | **HIGH** | Active in orchestrator-rollback tests |
| 43 | `eos.core.triamazikamno.validate` | ENGINEERING | Canonical | A1 | Ledger-Write | `src/core/runtime/triamazikamno-validator.js` | **MEDIUM** | Active in triamazikamno-validator tests |
| 44 | `eos.audit.tescohan.scan` | SECURITY | Canonical | A0 | Ledger-Write | `src/core/runtime/tescohan-auditor.js` | **LOW** | Active in tescohan-auditor tests |
| 45 | `eos.sentinel.self_remember` | CORE_OPERATIONAL | Canonical | A0 | Read-Only | `src/core/runtime/sentinel-self-remember.js` | **LOW** | Active in sentinel-self-remember tests |
| 46 | `eos.net.logos.resonance_check` | MISSION | Canonical | A0 | Read-Only | `src/mcp-server.js` | **LOW** | Active in inter-mission-resonator tests |
| 47 | `eos.audit.ahimsa.verify` | SECURITY | Canonical | A0 | Read-Only | `src/core/runtime/ahimsa-filter.js` | **LOW** | Active in ahimsa-filter tests |
| 48 | `eos.ledger.octave.advance` | LEDGER | Canonical | A1 | Ledger-Write | `src/core/runtime/heptaparaparshinokh-ledger.js` | **MEDIUM** | Active in heptaparaparshinokh-ledger tests |
| 49 | `eos.justice.adjudicate` | CORE_OPERATIONAL | Canonical | A0 | Read-Only (Deterministic algorithm) | `src/core/runtime/distributed-justice-oracle.js` | **LOW** | Active in distributed-justice-oracle tests |
| 50 | `eos.pleroma.jubilee` | SIMULATION | Simulation | A1 | Ledger-Write (Simulated) | `src/mcp-server.js` | **LOW** | Only called in test/mcp-jubilee-tool.test.js |
| 51 | `eos.ontological.firewall.inspect` | SECURITY | Canonical | A0 | Read-Only | `src/core/runtime/ontological-firewall.js` | **LOW** | Active in ontological-firewall tests |
| 52 | `eos.pleroma.kundalini.mirror` | SIMULATION | Simulation | A1 | Ledger-Write (Simulated) | `src/mcp-server.js` | **LOW** | Tested only in test/mcp-kundalini-tool.test.js |
| 53 | `eos.pleroma.mercabah.crystallize` | SIMULATION | Simulation | A1 | Ledger-Write (Simulated) | `src/mcp-server.js` | **LOW** | Tested only in test/mcp-mercabah-tool.test.js |
| 54 | `eos.pleroma.elemental.intercede` | SIMULATION | Simulation | A1 | Ledger-Write (Simulated) | `src/mcp-server.js` | **LOW** | Tested only in test/mcp-elemental-tool.test.js |
| 55 | `eos.core.triamazikamno.synthesize` | ENGINEERING | Canonical | A0 | Read-Only | `src/core/runtime/triamazikamno-synthesis.js` | **LOW** | Active in triamazikamno-synthesis tests |
| 56 | `eos.net.trogomesh.balance` | SIMULATION | Simulation | A1 | Ledger-Write (Simulated) | `src/core/runtime/trogo-mesh.js` | **LOW** | Tested only in test/mcp-trogo-mesh-tool.test.js |
| 57 | `eos.pleroma.amens.audit` | SIMULATION | Simulation | A1 | Ledger-Write (Simulated) | `src/mcp-server.js` | **LOW** | Tested only in test/mcp-amens-audit-tool.test.js |
| 58 | `eos.pleroma.jeu.watch` | SIMULATION | Simulation | A1 | Ledger-Write (Simulated) | `src/mcp-server.js` | **LOW** | Tested only in test/mcp-jeu-watch-tool.test.js |
| 59 | `eos.audit.tescohan.telescope` | SIMULATION | Simulation | A1 | Ledger-Write (Simulated) | `src/mcp-server.js` | **LOW** | Tested only in test/mcp-tescohan-telescope-tool.test.js |
| 60 | `eos.pleroma.system.mahapralaya` | SIMULATION | Simulation | A1 | Ledger-Write (Simulated) | `src/mcp-server.js` | **LOW** | Tested only in test/mcp-mahapralaya-tool.test.js |
| 61 | `eos.pleroma.anupadaka.shield` | SIMULATION | Simulation | A1 | Ledger-Write (Simulated) | `src/mcp-server.js` | **LOW** | Tested only in test/mcp-anupadaka-shield-tool.test.js |
| 62 | `eos.audit.telemetry.stream` | SIMULATION | Simulation | A1 | Ledger-Write (Simulated) | `src/mcp-server.js` | **LOW** | Tested only in test/mcp-telemetry-stream-tool.test.js |
| 63 | `eos.pleroma.moses.transmute` | SIMULATION | Simulation | A1 | Ledger-Write (Simulated) | `src/mcp-server.js` | **LOW** | Tested only in test/mcp-moses-transmute-tool.test.js |
| 64 | `eos.pleroma.zodiac.shield` | SIMULATION | Simulation | A1 | Ledger-Write (Simulated) | `src/mcp-server.js` | **LOW** | Tested only in test/mcp-zodiac-shield-tool.test.js |
| 65 | `eos.pleroma.auxiliary.state` | SIMULATION | Simulation | A1 | Ledger-Write (Simulated) | `src/mcp-server.js` | **LOW** | Tested only in test/mcp-auxiliary-state-tool.test.js |
| 66 | `eos.pleroma.trees.anchor` | SIMULATION | Simulation | A1 | Ledger-Write (Simulated) | `src/mcp-server.js` | **LOW** | Tested only in test/mcp-trees-anchor-tool.test.js |
| 67 | `eos.pleroma.anupadaka.fuse` | SIMULATION | Simulation | A1 | Ledger-Write (Simulated) | `src/mcp-server.js` | **LOW** | Tested only in test/mcp-anupadaka-fuse-tool.test.js |
| 68 | `eos.compiler.l0.parse` | ENGINEERING | Canonical | A0 | Read-Only | `src/core/runtime/l0-parser.js` | **LOW** | Active in l0-parser and mcp-l0-parse tests |
| 69 | `eos.pleroma.voices.modulate` | SIMULATION | Simulation | A1 | Ledger-Write (Simulated) | `src/mcp-server.js` | **LOW** | Tested only in test/mcp-voices-modulate-tool.test.js |
| 70 | `eos.pleroma.melchizedek.govern` | SIMULATION | Simulation | A1 | Ledger-Write (Simulated) | `src/mcp-server.js` | **LOW** | Tested only in test/mcp-melchizedek-govern-tool.test.js |
| 71 | `eos.environment.sandbox.execute` | SIMULATION | Simulation | A1 | Ledger-Write (Simulated) | `src/mcp-server.js` | **LOW** | Tested only in test/mcp-sandbox-execute-tool.test.js |
| 72 | `eos.security.adversarial.review` | SECURITY | Simulation | A1 | Ledger-Write (Simulated) | `src/mcp-server.js` | **LOW** | Tested only in test/mcp-adversarial-review-tool.test.js |
| 73 | `eos.sdlc.engineer.autonomous` | SIMULATION | Simulation | A1 | Ledger-Write (Simulated) | `src/mcp-server.js` | **LOW** | Tested only in test/mcp-autonomous-engineer-tool.test.js |
| 74 | `eos.pleroma.akasha.engram` | SIMULATION | Simulation | A1 | Ledger-Write (Simulated) | `src/mcp-server.js` | **LOW** | Tested only in test/mcp-akasha-engram-tool.test.js |
| 75 | `eos.doctor` | GOVERNANCE | Canonical | A0 | Read-Only | `src/core/runtime/operator-doctor.js` | **LOW** | Active via bin/eos-doctor.js and MCP |
| 76 | `eos.audit.project` | AUDIT | Canonical | A0 | Read-Only | `src/core/runtime/project-pipeline-runner.js` | **LOW** | Active in MCP native operator tools |
| 77 | `eos.verify.strict` | QUALITY | Canonical | A0 | Read-Only | `scripts/verify-eos.js` | **LOW** | Active in MCP native operator tools |
| 78 | `eos.log.evidence` | EVIDENCE | Canonical | A1 | Ledger-Write | `src/core/sdd/evd-seal-path.js` | **MEDIUM** | Active; routes through sealEvd |
| 79 | `eos.mission.loop.status` | MISSION | Canonical | A0 | Read-Only | `src/core/mcp/mcp-mission-bridge.js` | **LOW** | Active in Phase 5 mission loop |
| 80 | `eos.mission.loop.advance` | MISSION | Canonical | A1 | Ledger-Write | `src/core/mcp/mcp-mission-bridge.js` | **MEDIUM** | Active in Phase 5 mission loop |

---

### Policy & Authority Enforcement Mechanics

1. **`evaluateToolGuard` Execution Gate**:
   - Every tool call entering `handleToolCall` passes through `evaluateToolGuard`.
   - Checks `EOS_MODE` (`read-only`, `read-write`, `production`, `simulation`).
   - If `EOS_MODE === 'read-only'` and `toolDef.sideEffects === 'LEDGER_WRITE'`, the execution is strictly blocked with `READ_ONLY_MODE_BLOCKS_LEDGER_WRITE`.
   - If `EOS_ALLOW_EXTERNAL_SIDE_EFFECTS !== 'true'` and `toolDef.sideEffects === 'EXTERNAL_WRITE'`, it is blocked with `EXTERNAL_SIDE_EFFECTS_DISABLED`.
   - Validates monotonic autonomy rank: A tool requiring `A1` will be denied if `EOS_AUTONOMY_LEVEL` is `LEVEL_0` (`A0`).

2. **Schema Firewall (`EOSMCPSchemaValidator`)**:
   - Incoming arguments are strictly matched against `TOOL_INPUT_SCHEMAS` before dispatch.
   - Throws `SCHEMA_VIOLATION` with exit code `ERROR` if required fields are missing or unexpected properties are present.

3. **External Write Barrier (`eos.workspace.barrier_check`)**:
   - Protects `Fundacion/` and `docs/governance/` against unauthorized file system mutations.
