# MCP SSOT

Canonical: config/mcp/eos-mcp.ssot.json

## Sync

- Write: `npm run mcp:sync`
- Check: `node scripts/mcp-ssot-sync.js --check`

## Design

- L0_READONLY -> .agents/mcp_config.json
- L1_LOCAL_GOVERNED -> .cursor/mcp.json and .windsurf/mcp.json
- Rebuild eos-local + engram from SSOT; extras from extraServers
- Relative src/mcp-server.js; engram on PATH in tracked files
- .windsurf is gitignored but generated
- Check mode: gitignored consumers may be ABSENT_OK (CI/checkout); tracked consumers must exist
- If a gitignored consumer is present locally, check still fails on DRIFT

## Engram fallback

Local absolute binary OK untracked; never commit absolute paths.

## Drift

Check mode fails on hand-edited eos-local/engram; re-sync from SSOT.

## API key gateway

`eos-local` checks `EOS_API_KEY` before `tools/call` (stdio) and `Authorization: Bearer` before HTTP `POST /mcp`. The tracked env value is `${EOS_API_KEY}`, not a secret. Issue and client snippets: `docs/mcp/EOS_MCP_API_KEY_GATEWAY.md`. External tools on that gateway: `eos.doctor`, `eos.mission.status`, `eos.authority.check`.
