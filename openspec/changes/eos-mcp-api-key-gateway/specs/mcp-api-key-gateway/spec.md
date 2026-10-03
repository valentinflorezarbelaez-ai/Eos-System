# Spec — MCP API key gateway

## Requirements

### Key issuance

WHEN the operator runs `node scripts/eos-mcp-api-key.js issue`, THE SYSTEM prints the secret once on stdout and writes a scrypt hash file that does not contain the raw secret.

### stdio authentication

WHEN a stdio client calls `tools/call` and `EOS_API_KEY` is missing or does not match the hash, THE SYSTEM returns `UNAUTHORIZED` and does not execute a tool.

WHEN a stdio client calls `tools/call` and `EOS_API_KEY` matches the hash, THE SYSTEM may execute a tool that is on the read-only allowlist.

### HTTP authentication

WHEN an HTTP client calls `POST /mcp` without `Authorization: Bearer` or with a bearer that does not match the hash, THE SYSTEM responds with HTTP 401 and does not execute a tool.

WHEN an HTTP client calls `POST /mcp` with a matching bearer, THE SYSTEM accepts the JSON-RPC call under the same allowlist.

### Allowlist

THE SYSTEM advertises only `eos.doctor`, `eos.mission.status`, and `eos.authority.check` on this gateway.

IF the caller names any other tool, including a write tool, THEN THE SYSTEM rejects the call and does not execute it.

### Storage

THE SYSTEM stores the key file under a gitignored path. THE SYSTEM compares hashes in constant time via `timingSafeEqual`.

## Scenarios

### DADO a new issue command CUANDO the command finishes ENTONCES stdout contains the secret once Y the hash file does not contain that secret.

### DADO a hash file CUANDO `tools/call` arrives with no key ENTONCES the result is unauthorized Y the tool function is not called.

### DADO a hash file CUANDO `tools/call` arrives with the wrong key ENTONCES the result is unauthorized Y the tool function is not called.

### DADO a hash file CUANDO `tools/call` arrives with the matching key and `eos.authority.check` ENTONCES the existing handler runs.

### DADO a matching key CUANDO the caller asks for `eos.mission.start` ENTONCES the gateway rejects it Y the tool function is not called.

### DADO an HTTP request with a missing or wrong bearer CUANDO it hits `POST /mcp` ENTONCES the status is 401 Y no tool runs.
