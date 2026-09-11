# Proposal — Mission I: Gemini Tool Bridge (SPEC-0014)

## Why
SPEC-0013 delivered `queryGemini`. Workers still lack first-class `gemini_query` / `gemini_structured` tools with custody and hermetic bounds.

## What
1. `src/core/mcp/gemini-tool-bridge.js` — tool registry + executeGeminiTool (30s / 2MiB).
2. Wire into `executeComputeRun` toolCalls path (native eos-gemini / gemini_* names).
3. Suite `eos-compute-worker-mission-i.test.js`; slim-exclude; `test:compute-worker-i`.
4. Release report `EOS_MISSION_I_GEMINI_TOOL_BRIDGE_2026-09-11.md`.

## DoD
Branch `grok/mission-i-gemini-tool-bridge` from main@6befb41; tests green; SLIM≤145; verify:strict EXIT 0.
