# EOS MCP API key gateway

`eos-local` (`node src/mcp-server.js`) can be called by an editor over stdio, or by another local program over HTTP. Both transports check a local API key before a tool runs. This is not a second MCP server.

Transports in this slice: **stdio** and **HTTP**. Nothing else is implemented here.

The external surface advertises three existing read-only tools:

- `eos.doctor`
- `eos.mission.status`
- `eos.authority.check`

Write tools are rejected. This slice does not deploy, does not open `Fundacion/`, and does not skip human approval. `PRODUCTION_READY` is not claimed.

## Issue a key

```bash
node scripts/eos-mcp-api-key.js issue
```

The secret is printed once on stdout. The file `.eos/mcp-api-key.json` stores a scrypt hash only. That path is gitignored. Re-running `issue` replaces the hash; the previous secret stops working.

Override the path with `--store` or `EOS_MCP_API_KEY_FILE`. Do not commit the secret, and do not paste it into docs or evidence.

## Cursor (`mcp.json`)

Put this on the `eos-local` server. Replace `YOUR_KEY` with the secret the command printed. Do not commit that value.

```json
{
  "mcpServers": {
    "eos-local": {
      "command": "node",
      "args": ["src/mcp-server.js"],
      "env": {
        "EOS_API_KEY": "YOUR_KEY"
      }
    }
  }
}
```

The tracked SSOT (`config/mcp/eos-mcp.ssot.json`) records `"EOS_API_KEY": "${EOS_API_KEY}"`. That string is an editor placeholder, not a key.

`tools/call` reads `EOS_API_KEY` from the process environment and compares it to the hash. A missing or wrong key returns JSON-RPC `UNAUTHORIZED` and does not run a tool.

## HTTP

One process is one transport. HTTP does not share stdout with stdio.

```bash
node src/mcp-server.js --http
```

Default bind: `127.0.0.1:8787`. Override with `--port`, `EOS_MCP_HTTP_PORT`, or `EOS_MCP_HTTP_HOST`.

```bash
curl -sS -X POST http://127.0.0.1:8787/mcp \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer YOUR_KEY' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"eos.doctor","arguments":{}}}'
```

A missing or wrong bearer is HTTP 401 and `{ "error": "UNAUTHORIZED" }`. The tool is not called.

`OPTIONS /mcp` returns 204 and allows the `authorization` and `content-type` headers, so a page on another local port can call this process. The default bind stays `127.0.0.1`. The bearer check is unchanged.

## Browser chat

`site/index.html` section `#conector` is an HTTP client of this gateway. The person pastes the key into the page. The page does not write it to disk, to the repository, or to browser storage. The chat calls only `eos.doctor`, `eos.mission.status`, and `eos.authority.check`. Any other tool name is refused in the page before `fetch`.
