# EOS MCP Audit Reconciliation Report
## Mission ID: EOS-MCP-SURFACE-RATIONALIZATION-001 — Phase 1 Deliverable

---

### Executive Summary

During Phase 1 reconciliation, the previous audit artifacts were cross-referenced line-by-line against `src/mcp-server.js`, `CANONICAL_TOOLS`, the internal switch handlers, test files in `tests/`, and active runtime paths.

Six major contradictions and architectural drifts were detected and reconciled.

---

### Formal Contradiction Register

### [REC-01] Declared SideEffects vs Real Implementation in Simulation Tools
- **Severity**: `CRITICAL`
- **Previous Artifact Claim**: CANONICAL_TOOLS declares sideEffects: "LEDGER_WRITE" for 21 simulation tools (e.g. eos.pleroma.jubilee, eos.sdlc.engineer.autonomous, eos.environment.sandbox.execute).
- **Codebase Reality**: Handlers compute in-memory SHA-256 strings using crypto.createHash and return mock JSON receipts without writing to disk, without opening SQLite, and without calling kernel.registrarTransaccionLedger.
- **Operational Impact**: Agents and governance assume state is being persisted to an immutable ledger when in fact it is ephemeral, untracked, and disappears on process exit.
- **Formal Resolution**: Reclassify sideEffects to NONE (IN_MEMORY_MOCK) and segregate from Canonical Ledger Surface.

---
### [REC-02] Unreachable / Dead Handlers in Switch Statement
- **Severity**: `HIGH`
- **Previous Artifact Claim**: EOS_MCP_TOOL_CATALOG.json and CANONICAL_TOOLS list 74 tools.
- **Codebase Reality**: src/mcp-server.js contains 76 unique tool switch cases. eos.audit.parallel_dag.run (line 1120) and eos.governance.tier.classify (line 1127) have complete switch cases but are omitted from CANONICAL_TOOLS, causing handleToolCall to reject them with UNKNOWN_TOOL.
- **Operational Impact**: Dead code in server handler; functional capabilities exist in src/core/runtime/ but cannot be invoked via MCP.
- **Formal Resolution**: Formalize in Lab/Specialist registry or clean up switch statement.

---
### [REC-03] Redundant Underscore Alias Handlers vs normalizeToolName
- **Severity**: `LOW`
- **Previous Artifact Claim**: McpMissionBridge provides normalizeToolName() to transparently translate underscores to dots.
- **Codebase Reality**: src/mcp-server.js still contains 30 explicit case "eos_...": statements duplicated alongside case "eos....":.
- **Operational Impact**: Code clutter and potential routing divergence.
- **Formal Resolution**: Rely strictly on normalizeToolName() at entrypoint and remove redundant case duplication.

---
### [REC-04] Golden Path Tool Count Divergence (12 vs 18 vs 19)
- **Severity**: `MEDIUM`
- **Previous Artifact Claim**: Previous audit summary mentioned "12-tool minimum core", EOS_MCP_GOLDEN_PATH.md listed 19 critical path tools, and earlier docs cited 18 blueprint steps.
- **Codebase Reality**: The true operational lifecycle consists of 14 distinct atomic capabilities mapped to 14 canonical tools, while 5 tools were redundant wrappers or secondary views (e.g. eos.kernel.evidence vs eos.evidence.record; eos.mission.start vs eos.orchestrator.init; eos.scaffolder.generate vs eos.scaffolder.clean; eos.hud.dashboard as an ANSI view of eos.mission.status).
- **Operational Impact**: Ambiguity in agent system prompts regarding the exact minimal tool surface.
- **Formal Resolution**: Establish a unified 14-tool Canonical Agent Surface with 1-to-1 capability mapping.

---
### [REC-05] Provider Health Stub Inconsistency
- **Severity**: `LOW`
- **Previous Artifact Claim**: CANONICAL_TOOLS lists eos.provider.health with requiredAuthority: "A0" and sideEffects: "READ_ONLY".
- **Codebase Reality**: Handler unconditionally returns status: "NOT_CONFIGURED" with epistemic_class: "NOT_VERIFIED" and zero telemetry.
- **Operational Impact**: Exposes a dead tool that provides zero utility to agents.
- **Formal Resolution**: Move to Legacy Surface / remove from Canonical Surface.

---
### [REC-06] Duplicate Tool Description in CANONICAL_TOOLS
- **Severity**: `MEDIUM`
- **Previous Artifact Claim**: eos.pleroma.anupadaka.shield (#61) and eos.pleroma.anupadaka.fuse (#67) exist as distinct tools.
- **Codebase Reality**: Both have the exact same description string in CANONICAL_TOOLS: "Triadic force fusion token certification, inter-enclave secure channel attestation, and post-quantum state sealing".
- **Operational Impact**: Copy-paste duplication in tool registry.
- **Formal Resolution**: Mark as duplicate simulation stubs.

---


---

### [P5] Catalog reconcile to live CANONICAL_TOOLS (80)
- **Date**: 2026-09-09
- **Resolution**: EOS_MCP_TOOL_CATALOG.json and governance matrix/capability model updated from 74 to 80; six tools documented (eos.doctor, eos.audit.project, eos.verify.strict, eos.log.evidence, eos.mission.loop.status, eos.mission.loop.advance); verify lock scripts/lib/mcp-catalog-lock.js.
