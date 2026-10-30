# EOS Sovereign MCP Control Plane — Antigravity Governance Protocol

You have live access to the **`eos-system`** Model Context Protocol (MCP) Control Plane via `call_mcp_tool` (`ServerName: "eos-system"`). EOS directs architectural discipline, security boundaries, formal verification, and multi-repository fleet operations across all workspaces.

## 1. Active Mission Direction (`eos_antigravity_direct`)

Before executing any non-trivial engineering mission (new features, refactors, architectural changes, security audits, performance tuning, or fleet deployments):

1. Invoke `call_mcp_tool` on `ServerName: "eos-system"`, `ToolName: "eos_antigravity_direct"` with `{ "directive": "<user task>", "target": "<project id or workspace path>" }`.
2. Respect `writeBarrierStatus`:
   - If `AUTHORIZED`, proceed along the returned `prescribedMcpDag` and load any listed `requiredSkills` (`eos-director`, `eos-sdd-pipeline`, `eos-fleet-ops`).
   - If `READ_ONLY_UNREGISTERED_TARGET`, enforce **EOS Law IV (External Write Barrier)**: perform read-only reconnaissance or ask the user before registering/mutating an unregistered external repository.

## 2. Core EOS MCP Tool Routing

Use the `eos-system` MCP server tools at the corresponding lifecycle gates:

- **Requirements & OpenSpec Gate (Law I & II)**:
  - `eos_amplify_prompt`: Convert informal requests into IEEE 830 / EARS functional requirements and BDD scenarios.
  - `eos_check_openspec`: Detect specification drift across `openspec/specs/` and `openspec/changes/`.
  - `eos_semantic_search` / `eos_hnsw_knn_search`: Query architectural doctrines, ADRs, and domain invariants.
- **Hexagonal Purity & Blast Radius (Law V)**:
  - `eos_check_architecture`: Verify Layer-0 purity (0 production dependencies, 0 circular imports).
  - `eos_get_blast_radius` / `eos_datalog_query`: Identify transitive module impact and predictive test suites.
- **Safety Consensus & Patch Validation (Law VI)**:
  - `eos_evaluate_decision` / `eos_tmr_consensus`: Evaluate high-impact architectural decisions against the Seven Inviolable Commandments.
  - `eos_validate_patch`: Scan proposed file contents for syntax errors, secret leaks, and destructive patterns.
- **Epistemic Evidence & Fleet Delivery (Law III)**:
  - `eos_turbo_verify`: Run fast in-memory credential, architecture, and inventory checks before claiming `VERIFIED`.
  - `eos_fleet_soundcheck` / `eos_mcts_tune` / `eos_canary_rollout`: Audit Spotify Soundcheck scores across the sovereign fleet, tune parameters via UCT MCTS, and validate progressive canary rollouts.
  - `eos_antigravity_doctor`: Diagnose Antigravity MCP config, plugin, hooks, skills, and NTFS junction health.
