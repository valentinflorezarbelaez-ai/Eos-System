# Mission L — Stitch compute-worker tool bridge (SPEC-0017) — 2026-09-11

## Summary

Native Stitch tools (`stitch_*` / `serverName=eos-stitch`) are first-class compute-worker toolCalls via Mission J `stitch-tool-bridge` → `executeStitchTool`. MCP stdio dispatcher remains for non-native tools; Stitch and Gemini bypass it.

## Routing

| Signal | Path |
| --- | --- |
| `stitch_*` or `eos-stitch` | `executeStitchTool` (+ injectable `stitchClientImpl`) |
| `gemini_*` or `eos-gemini` | `executeGeminiTool` (SPEC-0014) |
| other | `McpToolDispatcher` |

Fail-closed: `STITCH_TOOL_FAILED` → rollbackDiff; applyDiff never after tool failure.

## Verification (box harness)

- `node --test tests/runners/eos-compute-worker-mission-l.test.js` → **12 PASS**, 1 SKIP (live)
- Slim: `eos-compute-worker-mission-l.test.js` in `SLIM_SUITE_EXCLUDES`
- Script: `npm run test:compute-worker-l`

## Governance

- PRODUCTION_READY=NO
- Fundacion Δ=0
- AT_CEILING (exclude-from-slim; TR-01 ≤145)
- Antigravity-first / no Cursor CloudAgent
- Zero new npm dependencies

## Branch

`grok/mission-l-stitch-worker-bridge` from `main@9a19072a3501f9278c943a4a03cd4ff4868c712f`
