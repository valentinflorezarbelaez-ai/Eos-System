# Spec — Live Tool Engine (SPEC-0038 / Mission AG)

## Purpose

Provide a hermetic, fail-closed **tool-call bus** with native and injectable
MCP dispatch, Law VI secret sanitization on inputs and outputs, and custody
receipts — without enabling live network tools in CI or unbounded fleets.

## Requirements

### R1 — Factory & kind
- `createLiveToolEngine(options)` returns object with
  `kind: 'eos-live-tool-engine'` and `PRODUCTION_READY: 'NO'`.

### R2 — Tool registry
- `registerTool({ name, handler, auth?, mode? })`, `listTools()`, `invoke(name, input, ctx?)`.

### R3 — Dispatch modes
- `native` — in-process handlers.
- `mcp` — injectable `mcpClient.callTool` port (fake in tests); missing → `MCP_UNAVAILABLE`.

### R4 — Fail-closed
- Unknown tool → `UNKNOWN_TOOL`.
- Unauthorized / missing auth → `TOOL_UNAUTHORIZED`.

### R5 — Law VI
- Sanitize inputs AND outputs (deep redact token/secret/password/api_key/authorization).
- Never echo secrets in receipts.
- No static vendor-key literals in source/tests (runtime synth only).

### R6 — Custody receipt
- Each invoke emits `{ tool, ok, code, at, receiptId, PRODUCTION_READY:'NO' }`
  (no secret fields). Exposed via `getReceipts()` / `getState()`.

### R7 — Honesty
- `health()` / `getState()` carry NON-CLAIM flags.
- No network in default CI path.
- Do NOT implement AH.

### R8 — Tests
- Hermetic suite ≥12 PASS; slim-excluded basename
  `eos-ag-live-tool-engine.test.js`.

## Non-requirements
- AH closeout, PRODUCTION_READY flip, CloudAgent, real Fundacion writes,
  live MCP servers in CI, unbounded tool fleet.
