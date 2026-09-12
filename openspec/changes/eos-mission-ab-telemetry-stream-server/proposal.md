# Proposal — Mission AB: Live Streaming & Visual Telemetry Server (SPEC-0033)

## Why

Ladder 13 audit names SPEC-0033 after Mission AA: eos-shell / FDIR / session state lack a governed live telemetry surface for an external HUD. Enterprise blueprint needs session.state, agent.step, fdir.cycle, and custody.receipt streams with Law VI secret sanitization and localhost-first bind.

## What

1. `src/core/telemetry/telemetry-stream-server.js` — `createTelemetryStreamServer` kind `eos-telemetry-stream-server`; pure `node:http`; SSE GET `/events`|`/v1/stream`; optional JSON-RPC POST `/rpc` (ping/health/subscribe); bind 127.0.0.1 only (fail-closed on non-loopback); `sanitizeTelemetryPayload` / `isLoopbackHost`; `TELEMETRY_PRODUCTION_READY='NO'`.
2. Suite `tests/eos-ab-telemetry-server.test.js` (AB1–AB12); slim-exclude basename; `npm run test:telemetry-server` / `test:mission-ab`.
3. OpenSpec change + release report + bootstrap + idempotent patcher.

## DoD

Branch `grok/mission-ab-telemetry-stream-server` from main tip starting with `097d0ec` (Mission AA); tests green (≥10 PASS, 0 FAIL); SLIM≤145; verify:strict EXIT 0 on host; PRODUCTION_READY=NO; Fundacion Δ=0; no AI commit attribution; no CloudAgent; zero new npm deps.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- Public internet ops / 0.0.0.0 bind
- PRODUCTION_READY flip
- Real Fundacion writes
- New npm dependencies
- Claiming SSE server ≡ production telemetry platform
- CloudAgent
