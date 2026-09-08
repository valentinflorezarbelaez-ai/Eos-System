# ADR-0014 — Phase 5 Mission Loop MCP Enforcement

- **Status:** Accepted (local governed)
- **Date:** 2026-09-08
- **Deciders:** EOS Control Plane

## Context

Governance matrix showed **Runtime FSM Gate: MISSING** for most mutating MCP tools. Phase 4 delivered `withWriteScope`; Phase 5 must prevent IDE/MCP bypass that jumps to Act without prior stages, and block Archive without Verify success evidence.

## Decision

1. Introduce SSOT stage enum Intent→Spec→Plan→Act→Evidence→Verify→Archive in `src/core/mcp/mission-loop.js`
2. Persist per-mission state in `.missions/<id>/mission-loop.json` via `MissionLoopRuntime`
3. Enforce in `EosMcpServer.handleToolCall` / `_guarded` through `McpMissionBridge.enforceMissionLoop`
4. Wrap Act write tools with Phase 4 `withWriteScope` / `assertWritable`
5. Fail-closed Archive without Verify `ok:true` receipt

## Consequences

- Mutating delivery tools require a started mission + legal stage
- Read-only allowlist remains usable without the full loop
- ATS/SDD FSM unchanged; loop is an MCP overlay, not a parallel Mission OS
