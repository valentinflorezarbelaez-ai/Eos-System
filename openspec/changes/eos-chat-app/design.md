# Design — EOS local chat

## Placement

| Concern | Path | Why |
| --- | --- | --- |
| Page section and form | `site/index.html` | Same site, same voice. One `h1` stays on the hero. |
| Chat presentation | `site/styles.css` | Existing palette. No framework. |
| Pure client | `site/chat-client.js` | No DOM, no `node:` imports. Browser and `node --test` share it. |
| Page wiring | `site/chat.js` | Reads the form, calls `fetch`, never persists the key. |
| CORS preflight | `src/mcp/http-gateway.js` | A page on another port cannot send `Authorization` unless the local gateway answers `OPTIONS`. |
| Rewrites | `vercel.json` | `/chat.js` and `/chat-client.js` go to `eos-site` only. |
| Operator note | `docs/mcp/EOS_MCP_API_KEY_GATEWAY.md` | One short pointer. The page is the Spanish explanation. |

`src/core/` is not modified. The chat does not import the kernel. It speaks JSON-RPC to the gateway that already allowlists the tools.

## Client

`planChatTurn({ apiKey, text })` returns `{ ok: false, code, message }` or `{ ok: true, tool, request }`.

- A missing or blank key returns `MISSING_KEY` and no `request`.
- A named tool outside `eos.doctor`, `eos.mission.status`, and `eos.authority.check` returns `UNKNOWN_TOOL` and no `request`. Write names are in that refusal.
- `doctor` or `eos.doctor` builds `tools/call` for `eos.doctor` with `{}`.
- Mission phrasing builds `eos.mission.status`. `missionId=<id>` is optional.
- Authority phrasing builds `eos.authority.check` only when `requiredLevel` and `grantedLevel` are present.
- Text that names no allowed tool returns `UNKNOWN_TOOL` and no `request`.
- The key is not a field of `request`. It is sent only as `Authorization: Bearer` at fetch time.

`renderGatewayBody(body)` reads `result.content[0].text`. When that JSON has `VERDICT`, the visible line includes `VERDICT: <value>`.

## Browser

Default endpoint: `http://127.0.0.1:8787/mcp`. The key field is `type="password"` with `autocomplete="off"`. Reload drops it. The transcript is a `role="log"` live region. A failed `fetch` says the local HTTP process is not reachable. It does not retry in a loop.

## CORS

`OPTIONS /mcp` returns 204 with `access-control-allow-origin` set to the request `Origin` (or `*` when absent), and `access-control-allow-headers` includes `authorization` and `content-type`. `POST` responses carry the same allow-origin header. This does not skip the bearer check and does not change the default bind `127.0.0.1`.

Documented in `docs/mcp/EOS_MCP_API_KEY_GATEWAY.md`.

## Landing copy

Spanish, same register as the rest of the page. It states both transports: stdio plus `EOS_API_KEY` for Cursor and any MCP client; HTTP bearer for any other program, including this chat. It names the three tools that this slice calls. It does not claim parity with other products.
