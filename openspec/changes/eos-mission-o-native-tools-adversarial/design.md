# Design — Mission O (SPEC-0020)

## Threat model (native-tool boundary)

| ID | Threat | Control (existing worker; asserted honestly) |
|----|--------|-----------------------------------------------|
| O1 | PRODUCTION_READY leak | Plan + runner + compose order stay `NO` / frozen |
| O2 | Unknown native-looking tool swallowed | `isNative*` false → `MCP_TOOL_DISPATCHER_REQUIRED` before loop |
| O3 | Gemini infra throw mid-compose | `GEMINI_TOOL_FAILED`; later natives skipped; applyDiff 0; rollbackDiff if provided |
| O4 | Stitch infra throw after gemini | `STITCH_TOOL_FAILED`; browser skipped; toolOutputs length 2 last `ok:false` |
| O5 | Browser QA infra throw after gemini+stitch | `BROWSER_QA_TOOL_FAILED`; applyDiff 0 |
| O6 | Soft CWV/a11y treated as infra | Soft QA keeps toolOutputs `ok:true`; applyDiff runs |
| O7 | Invalid/oversize stitch args | Bridge codes (`PROJECT_ID_REQUIRED` / `INVALID_DEVICE_TYPE` / `PAYLOAD_OVERSIZE`) → `STITCH_TOOL_FAILED` |
| O8 | Missing/oversize gemini prompt | `PROMPT_REQUIRED` / `PAYLOAD_OVERSIZE` → `GEMINI_TOOL_FAILED` |
| O9 | Mixed native + MCP without dispatcher | Pre-loop `needsMcpDispatcher` → `MCP_TOOL_DISPATCHER_REQUIRED`; natives do **not** run first; applyDiff 0 |
| O10 | Compose-builder reorder / injection | Empty/adversarial opts cannot reorder or inject non-natives; `MULTI_NATIVE_COMPOSE_ORDER` frozen |
| O11 | Custody COMPLETED on fail | Seal + `custodyReceipt` only on success; fail path omits receipt |
| O12 | Dispatcher invoked on pure-native | Spy dispatch count 0 |
| O13 | `serverName: eos-gemini` + `echo` spoof | `isNativeGeminiToolCall` true; `UNKNOWN_GEMINI_TOOL` → `GEMINI_TOOL_FAILED`; dispatcher not consulted |

## Worker delta

None expected. Mission N already: sequential compose loop, pre-loop dispatcher gate, native `*_TOOL_FAILED` mapping, rollbackDiff on tool fail, soft QA non-fail-close.

## Non-goals

No `src/core` mutation. No new dispatcher. No live Gemini/Stitch/Chrome in CI.
