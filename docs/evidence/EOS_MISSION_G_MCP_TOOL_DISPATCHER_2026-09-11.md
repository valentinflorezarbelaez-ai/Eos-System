# Evidence — Mission G (SPEC-0011) 2026-09-11

## Box harness

- `node --test tests/mcp-tool-dispatcher.test.js` → **11/11 PASS**
- Zero npm deps (node:child_process / events / buffer / stream)

## Deliverables

- `src/core/mcp/mcp-tool-dispatcher.js`
- `tests/mcp-tool-dispatcher.test.js`
- `tests/fixtures/mock-mcp-server.js`
- Slim exclude + `npm run test:mcp-dispatcher`

## Fail-closed codes

MCP_SERVER_NOT_RESOLVED | MCP_SERVER_CONFIG_MISSING | MCP_TIMEOUT | MCP_PROTOCOL_ERROR | MCP_PROCESS_EXIT | MCP_OUTPUT_OVERFLOW

## Governance

- PRODUCTION_READY=NO
- Fundacion Δ=0
- AT_CEILING
- Antigravity-first / no Cursor CloudAgent
