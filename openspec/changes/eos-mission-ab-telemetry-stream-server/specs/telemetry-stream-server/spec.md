# Spec — telemetry-stream-server (SPEC-0033 / Mission AB)

## Requirement: Loopback-only bind fail-closed

The system SHALL bind only to loopback hosts (`127.0.0.1`, `::1`, or
`localhost`). Construction or start with a non-loopback host (including
`0.0.0.0`) SHALL fail-closed with typed `TelemetryStreamServerError` /
`NON_LOOPBACK_HOST` or `BIND_DENIED`. Public bind SHALL never be claimed.

### Scenario: Non-loopback host rejected

- GIVEN host `0.0.0.0`
- WHEN `createTelemetryStreamServer` is invoked
- THEN it throws with code `NON_LOOPBACK_HOST`

## Requirement: SSE event stream

GET `/events` and `/v1/stream` SHALL respond with `text/event-stream`,
keep-alive comments, and broadcast JSON envelopes for published events.
Event types SHALL include at least `session.state`, `agent.step`,
`fdir.cycle`, and `custody.receipt`.

### Scenario: Published session.state reaches client

- GIVEN a started server and an open SSE client
- WHEN `publish('session.state', payload)` runs
- THEN the client receives an SSE frame with type `session.state`

## Requirement: Law VI secret sanitization

`sanitizeTelemetryPayload` SHALL deep-clone and redact keys matching
`/token|secret|password|api[_-]?key|authorization|credential/i` and long
base64-ish strings before broadcast. Original objects SHALL remain
untouched.

## Requirement: Fail-closed publish when stopped

`publish` while not running SHALL throw `NOT_RUNNING` (or return
`{ ok:false, code:'NOT_RUNNING' }` when `throwIfStopped:false`).

## Requirement: Optional JSON-RPC

POST `/rpc` MAY implement lightweight JSON-RPC methods `ping`, `health`,
and `subscribe`. Results SHALL include `PRODUCTION_READY:'NO'`.

## Requirement: PRODUCTION_READY remains NO + NON-CLAIM

`TELEMETRY_PRODUCTION_READY` SHALL equal `'NO'`.
`health().kind` SHALL equal `eos-telemetry-stream-server`.
`health().publicBind` SHALL be false.
Module docs SHALL include NON-CLAIM: not public internet ops, not
PRODUCTION_READY, localhost-first only. Fundacion Δ=0.

## Requirement: Multi-client fan-out

A single `publish` SHALL deliver the sanitized event to every currently
connected SSE client.
