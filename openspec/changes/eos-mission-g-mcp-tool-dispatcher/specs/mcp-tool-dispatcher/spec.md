# Spec — mcp-tool-dispatcher

## Requirement: Handshake
WHEN a session starts, the client SHALL send `initialize`, THEN `notifications/initialized`, before `tools/list` or `tools/call`.

## Requirement: Envelope gate
IF the target server is not listed in `envelope.resolvedServers`, THEN dispatch SHALL fail closed with `MCP_SERVER_NOT_RESOLVED` and SHALL NOT spawn a process.

## Requirement: Timeout
IF a JSON-RPC response is not received within `timeoutMs`, THEN the client SHALL fail closed with `MCP_TIMEOUT`.

## Requirement: Bounded output
IF framed stdout exceeds `maxOutputBytes`, THEN the client SHALL fail closed with `MCP_OUTPUT_OVERFLOW`.

## Requirement: Zero deps
The module SHALL import only Node.js built-ins.
