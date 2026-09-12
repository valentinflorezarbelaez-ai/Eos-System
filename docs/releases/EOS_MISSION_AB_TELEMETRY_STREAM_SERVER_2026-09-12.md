# Mission AB — Live Streaming & Visual Telemetry Server (SPEC-0033) — 2026-09-12

## Summary

Fail-closed **Live Streaming & Visual Telemetry Server** that exposes
session / agent / FDIR / custody events over pure `node:http` SSE
(`text/event-stream`) with optional JSON-RPC (`ping` / `health` /
`subscribe`), binds **127.0.0.1 only** (reject non-loopback), and applies
**Law VI** secret sanitization before broadcast. New module under
`src/core/telemetry/` — additive overlay; **does not** open real Fundacion,
**does not** flip PRODUCTION_READY, **does not** use CloudAgent, **does not**
claim public internet ops.

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — no Fundacion paths touched |
| PRODUCTION_READY | **`NO`** (never YES) |
| Public internet ops | **NON-CLAIM** — not public internet ops |
| Localhost-first | **REQUIRED** — 127.0.0.1 / ::1 only; never 0.0.0.0 |
| SSE broadcast | **≠** production telemetry platform |
| CloudAgent | **NON-CLAIM** — no CloudAgent |
| App Fuerza / Fundacion trees on disk | **untouched** |

## Routing

| Signal | Path |
| --- | --- |
| Lifecycle | `createTelemetryStreamServer` → start / stop / publish / health / getState / getClients |
| SSE | GET `/events`, `/v1/stream` — `text/event-stream` |
| JSON-RPC | POST `/rpc` — ping / health / subscribe |
| Bind | `isLoopbackHost` gate; default `127.0.0.1`; ephemeral port OK |
| Sanitizer | `sanitizeTelemetryPayload` — Law VI deep clone + redact |
| Events | `session.state`, `agent.step`, `fdir.cycle`, `custody.receipt`, `shell.status` |
| AGY / CloudAgent | **NON-CLAIM** — no CloudAgent |

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/telemetry/telemetry-stream-server.js` | **NEW** |
| `tests/eos-ab-telemetry-server.test.js` | **NEW** |
| `scripts/patch-mission-ab.mjs` | **NEW** |
| Real Documents/Fundacion | **No** |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude via patcher |
| OpenSpec + release + bootstrap | **Yes** |

## Verification (box harness)

```
cd /workspace/Eos-mission-ab-payload && node --test tests/eos-ab-telemetry-server.test.js
```

→ **13 PASS**, 0 SKIP, 0 FAIL (AB1–AB12 + AB6b)

Slim exclude `eos-ab-telemetry-server.test.js` + `npm run test:telemetry-server` / `test:mission-ab`.

## Cases

| ID | Result |
| --- | --- |
| AB1 kind + PRODUCTION_READY NO | PASS |
| AB2 start binds 127.0.0.1 only | PASS |
| AB3 reject non-loopback host fail-closed | PASS |
| AB4 SSE client receives published session.state | PASS |
| AB5 agent.step / fdir.cycle / custody.receipt broadcast | PASS |
| AB6 secret sanitizer redacts token/password fields | PASS |
| AB6b publish path applies sanitizer | PASS |
| AB7 stop closes clients / server | PASS |
| AB8 publish before start fail-closed | PASS |
| AB9 health never claims PRODUCTION_READY yes / public bind | PASS |
| AB10 NON-CLAIM source strings | PASS |
| AB11 JSON-RPC ping/health | PASS |
| AB12 multiple clients fan-out | PASS |

## Package scripts (exact)

```json
"test:telemetry-server": "node --test tests/eos-ab-telemetry-server.test.js",
"test:mission-ab": "node --test tests/eos-ab-telemetry-server.test.js"
```

SLIM_SUITE_EXCLUDES entry: `'eos-ab-telemetry-server.test.js'`

Applied on host by `scripts/patch-mission-ab.mjs` (idempotent).

## API (public)

```js
import {
  createTelemetryStreamServer,
  sanitizeTelemetryPayload,
  isLoopbackHost,
  TELEMETRY_KIND,
  TELEMETRY_PRODUCTION_READY,
  TELEMETRY_EVENT_TYPES
} from './src/core/telemetry/telemetry-stream-server.js';

const s = createTelemetryStreamServer({ host: '127.0.0.1', port: 0 });
const { port } = await s.start();
s.publish('session.state', { sessionId: '…', phase: 'ACTIVE' });
s.publish('agent.step', { agentId: 'a1', step: 'plan' });
s.publish('fdir.cycle', { cycle: 1 });
s.publish('custody.receipt', { prevHash: '0'.repeat(64), sha256: '…' });
// SSE clients: GET http://127.0.0.1:${port}/events
await s.stop();
```

Helpers: `sanitizeTelemetryPayload(obj)`, `isLoopbackHost(host)`.

## Governance

- PRODUCTION_READY=NO | Fundacion Δ=0 | AT_CEILING | Antigravity-first | zero new npm deps
- SLIM ≤145 via exclude-from-slim (no TR-01 raise)
- Base tip Expected: starts with `097d0ec` (Mission AA on main)
- **NON-CLAIM:** not public internet ops; not PRODUCTION_READY; localhost-first only
- No AI commit attribution

## Branch

`grok/mission-ab-telemetry-stream-server`

## Payload

`/workspace/Eos-mission-ab-payload/` (host: `C:\Users\valen\Documents\Eos-mission-ab-payload`)
