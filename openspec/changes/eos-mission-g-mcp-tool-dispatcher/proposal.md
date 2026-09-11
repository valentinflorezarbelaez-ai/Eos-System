# Proposal — Mission G: MCP Tool Dispatcher (SPEC-0011)

## Why

Missions E–F deliver capability projection and adversarial fortify for the compute worker, but EOS still cannot invoke real MCP tools over local stdio. Operators need a governed, fail-closed JSON-RPC bridge.

## What

1. `src/core/mcp/mcp-tool-dispatcher.js` — Tier-2 stdio MCP client (initialize → notifications/initialized → tools/list|tools/call).
2. Envelope gate: server must appear in `mcpEnvelope.resolvedServers`.
3. Deterministic timeout (default 10s) + bounded stdout buffer.
4. Tests `tests/mcp-tool-dispatcher.test.js` + mock fixture; slim-exclude; `npm run test:mcp-dispatcher`.

## DoD

- Branch `grok/mission-g-mcp-tool-dispatcher` from origin/main @ c2910a3.
- `npm run test:mcp-dispatcher` PASS; slim ≤145; `verify:strict` EXIT 0.
- PRODUCTION_READY=NO; Fundacion Δ=0; zero npm deps.

## Routing

SDD / Antigravity-first / Zero vibe / No Cursor CloudAgent.
