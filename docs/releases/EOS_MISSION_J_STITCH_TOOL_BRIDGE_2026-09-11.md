# Mission J — Stitch UI Generator Bridge (SPEC-0015) — 2026-09-11

## Summary

Google Stitch UI generator tools are exposed as a hermetic MCP-style bridge at `src/core/mcp/stitch-tool-bridge.js`:

- `stitch_list_projects`
- `stitch_generate_screen` (DESKTOP | MOBILE)
- `stitch_get_screen`
- `stitch_export_design_md`

Unified entry: `executeStitchTool`. Injectable `clientImpl` for CI; live path opt-in only (`STITCH_ALLOW_LIVE` + `fetchImpl` / `RUN_LIVE_STITCH_TESTS`).

This change is **bridge-first** — compute-worker wiring is deferred to a later mission.

## Bounds

| Knob | Value |
| --- | --- |
| Timeout | 30s |
| Max prompt bytes | 2 MiB |
| deviceType | DESKTOP \| MOBILE |
| Fail-closed | CLIENT_IMPL_REQUIRED, INVALID_DEVICE_TYPE, PROJECT_ID_REQUIRED, PROMPT_REQUIRED, SCREEN_ID_REQUIRED, PAYLOAD_OVERSIZE, TIMEOUT |

## Custody

Per successful call: `{ tool, input_hash (SHA-256; secrets stripped), duration_ms, status: VERIFIED, PRODUCTION_READY: NO }`.

## Verification (box harness)

- `node --test tests/runners/eos-stitch-tool-bridge.test.js` → **15 PASS**, 1 SKIP (live gated by `RUN_LIVE_STITCH_TESTS`)
- Slim: `eos-stitch-tool-bridge.test.js` added to `SLIM_SUITE_EXCLUDES`
- Script: `npm run test:stitch`

## Governance

- PRODUCTION_READY=NO
- Fundacion Δ=0
- AT_CEILING (exclude-from-slim; TR-01 ≤145)
- Antigravity-first / no Cursor CloudAgent
- Zero new npm dependencies

## Branch

`grok/mission-j-stitch-tool-bridge` from `main@354d7c497c799521fa36ab4e546f12bbeac6e80c`
