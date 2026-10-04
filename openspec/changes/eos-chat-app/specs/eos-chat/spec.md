# Spec — EOS local chat

## Requirements

### Connector, in Spanish, on the existing page

WHEN a visitor reads the connector section of `site/index.html`, THE SYSTEM says that Cursor and any MCP client use stdio with `EOS_API_KEY`, and that any other program uses HTTP with `Authorization: Bearer`.

THE SYSTEM names the three tools this chat calls: `eos.doctor`, `eos.mission.status`, and `eos.authority.check`.

THE SYSTEM describes what this slice implements: a chat on this page that pastes a local key and calls those tools. THE SYSTEM does not claim parity with Claude Code, Codex, Gemini, Antigravity, Gentle AI, or Engram.

THE SYSTEM keeps one `h1`, `lang="es"`, the skip link, and the existing driver names.

### Missing key

WHEN `planChatTurn` receives a missing or blank `apiKey`, THE SYSTEM returns `MISSING_KEY` and does not build a JSON-RPC request.

### Unknown tool

WHEN the message names a tool other than the three read-only tools, including a write tool, THE SYSTEM returns `UNKNOWN_TOOL` and does not build a JSON-RPC request.

WHEN the message names no allowed tool, THE SYSTEM returns `UNKNOWN_TOOL` and does not build a JSON-RPC request.

### Doctor render

WHEN `renderGatewayBody` receives a JSON-RPC result whose text content is a doctor payload with `VERDICT`, THE SYSTEM returns a visible line that includes that verdict.

### Key handling

THE SYSTEM does not place the API key inside the JSON-RPC request. THE SYSTEM does not write the key to `localStorage` or `sessionStorage`.

### Browser call

WHEN the page sends a planned call, THE SYSTEM uses `POST` and `Authorization: Bearer` against the endpoint the person typed. The default endpoint is `http://127.0.0.1:8787/mcp`.

IF `fetch` fails, THEN THE SYSTEM tells the person the local HTTP gateway is unreachable and does not retry in a loop.

### CORS for that browser call

WHEN a browser sends `OPTIONS /mcp`, THE SYSTEM returns 204 and allows the `authorization` and `content-type` headers.

WHEN the bearer is missing or wrong, THE SYSTEM still returns HTTP 401 and does not execute a tool.

### Public routes

WHEN `/chat.js` or `/chat-client.js` is requested on the public host, THE SYSTEM rewrites it to the `eos-site` service. Other services stay unpublished.

## Scenarios

### DADO an empty key CUANDO the person asks for doctor ENTONCES the code is `MISSING_KEY` Y there is no request.

### DADO a key CUANDO the person names `eos.mission.create` ENTONCES the code is `UNKNOWN_TOOL` Y there is no request.

### DADO a doctor JSON-RPC fixture with `VERDICT` `PASS` CUANDO the body is rendered ENTONCES the visible line contains `VERDICT: PASS`.

### DADO a page on another origin CUANDO it preflights `POST /mcp` ENTONCES the gateway allows the authorization header Y a missing bearer is still 401.
