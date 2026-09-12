# Design — Mission AB (SPEC-0033)

## Architecture

```
createTelemetryStreamServer({
  host?='127.0.0.1',   // fail-closed if not loopback
  port?=0,             // ephemeral
  path?='/events',     // also serves /v1/stream
  rpcPath?='/rpc',
  enableRpc?=true,
  idFactory?, onError?
})
  start()  → http.createServer listen(host, port) — NEVER 0.0.0.0
  stop()   → close all SSE clients + server
  publish(type, payload)
    1. !running → TelemetryStreamServerError NOT_RUNNING (fail-closed)
    2. sanitizeTelemetryPayload(payload) — Law VI deep clone + redact
    3. broadcast SSE event: type + JSON envelope to all clients
  health/getState/getClients
    kind:'eos-telemetry-stream-server', PRODUCTION_READY:'NO',
    publicBind:false, notPublicInternetOps:true, localhostFirstOnly:true
```

## Law VI secret sanitization

Keys matching `/token|secret|password|api[_-]?key|authorization|credential/i`
→ `[REDACTED]`. Long base64-ish strings (≥40 chars `[A-Za-z0-9+/=_-]`) →
`[REDACTED]`. Deep clone; original payload untouched.

## Event types

| Type | Intent |
|------|--------|
| `session.state` | Sovereign session phase / state |
| `agent.step` | Swarm / agent step progress |
| `fdir.cycle` | FDIR remediation cycle |
| `custody.receipt` | Ledger / custody receipt |
| `shell.status` | Optional shell HUD status |

## Endpoints

| Method | Path | Role |
|--------|------|------|
| GET | `/events`, `/v1/stream` | SSE `text/event-stream` |
| POST | `/rpc` | JSON-RPC ping / health / subscribe |
| GET | `/health`, `/` | JSON health snapshot |

## Controls

| ID | Control |
|----|---------|
| AB1 | kind + PRODUCTION_READY NO |
| AB2 | start binds 127.0.0.1 only |
| AB3 | reject non-loopback host fail-closed |
| AB4 | SSE client receives published session.state |
| AB5 | agent.step / fdir.cycle / custody.receipt broadcast |
| AB6 | secret sanitizer redacts token/password fields |
| AB7 | stop closes clients / server |
| AB8 | publish before start fail-closed |
| AB9 | health never claims PRODUCTION_READY yes / public bind |
| AB10 | NON-CLAIM source strings |
| AB11 | JSON-RPC ping/health |
| AB12 | multiple clients fan-out |

## Honesty / NON-CLAIM

- not public internet ops
- not PRODUCTION_READY
- localhost-first only
- Fundacion Δ=0
- SSE broadcast ≠ production telemetry platform

## Non-goals

No PRODUCTION_READY flip. No CloudAgent. No 0.0.0.0 bind. No TR-01 raise. No new npm deps. No Fundacion touches.
