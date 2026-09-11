# Mission I — Gemini Tool Bridge (SPEC-0014) — 2026-09-11

## Summary

Native Gemini tools `gemini_query` and `gemini_structured` are first-class compute-worker toolCalls via `src/core/mcp/gemini-tool-bridge.js` → `queryGemini` (SPEC-0013). MCP stdio dispatcher remains pure; worker routes Gemini natively (`eos-gemini` / `gemini_*`).

## Bounds

| Knob | Value |
| --- | --- |
| Timeout | 30s |
| Max bytes | 2 MiB |
| Fail-closed | KEY_MISSING, PAYLOAD_OVERSIZE, TIMEOUT |

## Custody

Per successful tool output: `{ tool, input_hash (SHA-256), duration_ms, status: VERIFIED, PRODUCTION_READY: NO }`. Seal path continues to record `tool_execution_hashes`.

## Verification (box harness)

- `node --test tests/runners/eos-compute-worker-mission-i.test.js` → 13 PASS, 1 SKIP (live gated by `RUN_LIVE_GEMINI_TESTS`)
- Live network opt-in only

## Governance

- PRODUCTION_READY=NO
- Fundacion Δ=0
- AT_CEILING
- Antigravity-first / no Cursor CloudAgent
- Zero new npm dependencies

## Branch

`grok/mission-i-gemini-tool-bridge` from `main@6befb41`
