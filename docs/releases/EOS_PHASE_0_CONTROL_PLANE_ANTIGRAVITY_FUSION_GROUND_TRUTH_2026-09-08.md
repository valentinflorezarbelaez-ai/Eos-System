# EOS Phase 0 Control Plane / Antigravity Fusion — Ground Truth Freeze

**Date:** 2026-09-08
**Branch tip at freeze inventory:** `385e577` (`385e577c0fc33534621b89884cc563d722d2fdad`)
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE
**PRODUCTION_READY:** NO

## Purpose

Phase 0b publishes a verified inventory of the local control-plane surface before Phase 1 MCP SSOT work. Evidence over claims.

## Verified inventory (re-run locally 2026-09-08)

### Git

- `main` HEAD: `385e577c0fc33534621b89884cc563d722d2fdad`
- Subject: feat(formal): implement EconomicContractValidator and quantitative ECR circuit breaker
- Remote: origin https://github.com/valentinflorezarbelaez-ai/Eos-.git
- Working tree at inventory time: dirty with unrelated pre-existing modified/untracked files (not part of this freeze publish)

### Package / runtime

- package.json name: eos-system, version: 0.6.0, type: module
- Node: v24.19.0
- MCP entrypoint present: src/mcp-server.js
- Existing scripts include mcp:start; Phase 1 adds mcp:sync

### MCP consumers (pre-SSOT state)

| Consumer | Tracked | eos-local profile (observed) | engram command (observed) | Notes |
|---|---|---|---|---|
| .agents/mcp_config.json | yes | L0-like read-only / LEVEL_0 | absolute engram.exe path | absolute mcp-server.js path |
| .cursor/mcp.json | yes | L1 read-write / LEVEL_1 / LOCAL_GOVERNED_MVP | engram on PATH | relative src/mcp-server.js |
| .windsurf/mcp.json | no (.windsurf/ gitignored) | L1-like | absolute engram.exe | absolute cwd/args |

### Fundacion

- Tracked entry: gitlink `Fundacion` (count=1)
- Constraint: Phase 0b/1 must not modify anything under Fundacion/
- Status at inventory: untouched (Delta target = 0 for this change set)

### Freeze gate pointer

- Status file: docs/releases/EOS_FREEZE_GATE_STATUS.md
- PRODUCTION_READY remains NO

## Phase 1 follow-through (this change set)

- Introduce config/mcp/eos-mcp.ssot.json as SSOT
- scripts/mcp-ssot-sync.js regenerates consumers; see docs/mcp/MCP_SSOT.md
- Profiles: L0_READONLY (.agents), L1_LOCAL_GOVERNED (.cursor + .windsurf)
- Tracked configs must not contain machine-absolute user paths

## Explicit non-goals

- No PRODUCTION_READY=YES
- No merge to main in this phase
- No Fundacion changes

## Phase 2 follow-through (agent entrypoints)

- Thin root stubs: AGENTS.md, GEMINI.md, CLAUDE.md, codex.md
- Canonical protocol remains .agents/AGENTS.md (undiluted)
- Doc: docs/agents/AGENT_ENTRYPOINTS.md
- Drift guard: scripts/agent-entrypoints-check.js + tests/agent-entrypoints.test.js
- OpenSpec mandatory steps tracked: docs/openspec-tasks-mandatory-steps.md
