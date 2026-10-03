# Design — EOS MCP API key gateway

## Placement

| Concern | Path | Why |
| --- | --- | --- |
| Key issue and verify | `src/mcp/api-key-gate.js` | `node:crypto` scrypt + `timingSafeEqual`. No new package. |
| JSON-RPC allowlist | `src/mcp/readonly-gateway.js` | Auth, then three read-only tools. Does not import the kernel. |
| HTTP | `src/mcp/http-gateway.js` | `node:http`. Same allowlist. 401 before tool dispatch. |
| stdio listener | `src/mcp-server.js` `start()` | Existing `eos-local` entry. Calls the gateway before `handleToolCall`. |
| Issue command | `scripts/eos-mcp-api-key.js` | Prints the secret once on stdout. Hash path on stderr. |
| Editor config | `config/mcp/eos-mcp.ssot.json` | Adds `EOS_API_KEY` as `${EOS_API_KEY}` so the tracked file has no secret. |
| Operator doc | `docs/mcp/EOS_MCP_API_KEY_GATEWAY.md` | Snippets with `YOUR_KEY`. |

`src/core/` is not modified. In-process `EosMcpServer.handleToolCall` stays available to the existing test suite. Listeners are the boundary: stdio and HTTP.

## Key file

Default path: `<control-plane-root>/.eos/mcp-api-key.json`. Override: `EOS_MCP_API_KEY_FILE`.

Record fields: `version`, `kdf` (`scrypt`), `salt`, `hash`, `keyLen`, `n`, `r`, `p`, `createdAt`. The raw secret is not a field. Compare with `scryptSync` and `timingSafeEqual`. A missing file, a missing key, or a mismatch is `UNAUTHORIZED`. Re-issue replaces the hash; the previous secret stops working.

## Transports

One process, one transport.

- stdio (default): JSON-RPC on stdin/stdout. `EOS_API_KEY` is read from the environment. `initialize` and `tools/list` do not run tools. `tools/call` checks the key first. Failure is a JSON-RPC error and does not call the tool.
- HTTP (`node src/mcp-server.js --http`): binds `127.0.0.1:8787` unless `EOS_MCP_HTTP_HOST` / `EOS_MCP_HTTP_PORT` / `--port` say otherwise. `POST /mcp` requires `Authorization: Bearer`. Missing or wrong key: HTTP 401, body `{ "error": "UNAUTHORIZED" }`, no tool call. A correct key then uses the same JSON-RPC allowlist.

## Tools on this surface

| Tool | Why it is in the slice |
| --- | --- |
| `eos.doctor` | Existing read-only control-plane diagnosis. |
| `eos.mission.status` | Existing read-only mission inspection. |
| `eos.authority.check` | Existing read-only authority check. |

Any other name, including write tools, returns a JSON-RPC error and does not call `handleToolCall`.

## Editor snippet

Documented, not committed as a live secret:

```json
{
  "mcpServers": {
    "eos-local": {
      "command": "node",
      "args": ["src/mcp-server.js"],
      "env": { "EOS_API_KEY": "YOUR_KEY" }
    }
  }
}
```

The tracked SSOT value is `${EOS_API_KEY}`, the same placeholder style already used for other editor secrets. It is not a key.
