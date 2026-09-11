# Design — Mission G (SPEC-0011)

## Transport

MCP stdio Content-Length framing over child_process stdout/stdin.

## Authority

`assertServerInEnvelope(serverName, envelope)` before spawn. Missing envelope or absent server → `MCP_SERVER_NOT_RESOLVED`.

## Timeouts & bounds

Per-request timer (default 10000ms). Accumulated framed payload bytes capped (default 1MiB) → `MCP_OUTPUT_OVERFLOW`.

## NON-goals

No worker wiring in this change; no Fundacion; no new schemas.
