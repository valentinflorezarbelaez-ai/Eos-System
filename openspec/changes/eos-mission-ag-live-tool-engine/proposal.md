# Proposal — Mission AG: Live Tool Engine (SPEC-0038)

## Why

Ladder 14 audit ranks **Live Tool Engine** as the fourth L14 satellite (after
AD provider port, AE budget ECR, AF autonomous execution loop). MCP catalog /
tool surfaces exist as KEEP inventory, but there is no **governed tool-call
bus** with custody receipts when the autonomous loop invokes tools.

## What

1. `src/core/tools/live-tool-engine.js` — `createLiveToolEngine`; kind
   `eos-live-tool-engine`; `registerTool` / `listTools` / `invoke`; dispatch
   modes `native` and `mcp` (injectable `mcpClient`); unknown → `UNKNOWN_TOOL`;
   unauthorized → `TOOL_UNAUTHORIZED`; Law VI sanitize in/out; custody receipt
   per invoke; `health` / `getState` / `getReceipts`;
   `AG_PRODUCTION_READY='NO'`.
2. Optional `src/core/tools/tool-custody-receipt.js` thin helper.
3. Suite `tests/eos-ag-live-tool-engine.test.js` (AG1–AG16) hermetic fakes;
   **no static vendor-key literals** (AF11 / Law VI lesson — runtime synth);
   slim-exclude; `npm run test:live-tool-engine` / `test:mission-ag`.
4. OpenSpec change + release report + bootstrap + idempotent patcher.

## DoD

Branch `grok/mission-ag-live-tool-engine` from main tip starting with
`da18fde` (Mission AF #201 / tip-200 lineage; StartsWith); tests green
(~12–16 PASS, 0 FAIL); SLIM≤145; verify:strict EXIT 0 on host;
PRODUCTION_READY=NO; Fundacion Δ=0; no AI commit attribution; no CloudAgent;
zero new npm deps; do NOT implement AH; no live network in CI.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- AH L14 seam-pack / closeout
- PRODUCTION_READY flip
- Real Fundacion writes
- Live network / real MCP servers in CI (fake mcpClient only)
- Unbounded tool fleet / CloudAgent
- Static vendor API key literals in source/tests
