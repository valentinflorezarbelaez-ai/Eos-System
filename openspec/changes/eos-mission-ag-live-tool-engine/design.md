# Design — Mission AG (SPEC-0038)

## Architecture

```
createLiveToolEngine({
  mode?:'native'|'mcp',
  mcpClient?,          // injectable { callTool(name, input, ctx?) } — fake in tests
  now?,
  throwOnDeny?=false
})
  registerTool({ name, handler, auth?, mode? })
  listTools()
  invoke(name, input, ctx?)
    1. unknown tool → DENY UNKNOWN_TOOL
    2. auth required missing/mismatch → DENY TOOL_UNAUTHORIZED
    3. Law VI sanitize input
    4. native handler OR mcpClient.callTool
    5. Law VI sanitize output
    6. emit custody receipt { tool, ok, code, at, receiptId, PRODUCTION_READY:'NO' }
  health() / getState() / getReceipts()
    kind:'eos-live-tool-engine', PRODUCTION_READY:'NO'
```

## Fail-closed codes

| Condition | Code |
|-----------|------|
| unknown tool | `UNKNOWN_TOOL` |
| missing / bad auth | `TOOL_UNAUTHORIZED` |
| mcp mode without client | `MCP_UNAVAILABLE` |
| handler throw | `TOOL_ERROR` |
| empty name / bad register | `INVALID_INPUT` |
| native tool missing handler | `ANOMALY` |

## Law VI

- Deep redact keys matching api_key / token / authorization / secret / password
- Redact vendor-style key substrings via runtime-built regex (never static
  vendor-key literals in source — AF11 lesson / pre-commit)
- Receipts never carry secret fields

## Controls

| ID | Control |
|----|---------|
| AG1 | kind + PRODUCTION_READY NO |
| AG2 | register + invoke native OK |
| AG3 | unknown DENY |
| AG4 | unauthorized DENY |
| AG5 | Law VI redact inputs (runtime synth) |
| AG6 | Law VI redact outputs |
| AG7 | sanitizeAgPayload unit |
| AG8 | mcp fake dispatch |
| AG9 | mcp without client |
| AG10 | receipt custody shape |
| AG11 | health / getState / getReceipts |
| AG12 | no network / hermetic |
| AG13 | handler throw TOOL_ERROR |
| AG14 | role auth + listTools |
| AG15 | no static vendor-key literals |
| AG16 | registerTool validation + dual-mode |

## Honesty / NON-CLAIM

- tool bus ≠ unbounded fleet
- tool bus ≠ CloudAgent
- tool bus ≠ PRODUCTION_READY
- not AH / Antigravity-first
- Fundacion Δ=0

## Non-goals

No PRODUCTION_READY flip. No CloudAgent. No TR-01 raise. No new npm deps.
No Fundacion touches. No AH. No live network in CI.
