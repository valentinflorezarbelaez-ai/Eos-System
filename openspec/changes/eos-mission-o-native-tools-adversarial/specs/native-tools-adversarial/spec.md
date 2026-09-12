# Spec — native-tools-adversarial

## Requirement: PRODUCTION_READY remains NO
The worker plan, Browser QA runner, and Mission O suite SHALL report `PRODUCTION_READY=NO`. `MULTI_NATIVE_COMPOSE_ORDER` SHALL remain frozen as `['eos-gemini','eos-stitch','eos-browser-qa']`.

## Requirement: Unknown lookalike tools are not natives
A toolCall whose `toolName` is not in the Gemini/Stitch/Browser QA builtin lists and whose `serverName` is not `eos-gemini` / `eos-stitch` / `eos-browser-qa` SHALL NOT be classified by `isNativeBuiltinToolCall`. Without a dispatcher, `executeComputeRun` SHALL return `MCP_TOOL_DISPATCHER_REQUIRED` with applyDiff count 0.

## Requirement: Mid-compose infra abort
An infra throw from Gemini, Stitch, or Browser QA SHALL abort remaining natives, return the matching `*_TOOL_FAILED` status, invoke `rollbackDiff` when provided, and SHALL NOT call `applyDiff`. Partial `toolOutputs` SHALL record the failed entry as `ok:false`.

## Requirement: Soft QA is not fail-closed
CWV/a11y soft failures SHALL keep the QA `toolOutputs` entry `ok:true` (report `result.ok:false`) and SHALL allow `applyDiff`.

## Requirement: Invalid native args fail-closed
Missing/oversize Gemini prompt SHALL surface as `GEMINI_TOOL_FAILED` with bridge codes `PROMPT_REQUIRED` or `PAYLOAD_OVERSIZE`. Missing `projectId`, invalid `deviceType`, or oversize Stitch prompt SHALL surface as `STITCH_TOOL_FAILED` with the documented bridge code. applyDiff SHALL NOT run.

## Requirement: Mixed plan dispatcher gate
When any toolCall is non-native and `toolDispatcher` is missing, `executeComputeRun` SHALL return `MCP_TOOL_DISPATCHER_REQUIRED` **before** the sequential loop (natives do not run first; applyDiff 0).

## Requirement: Compose builder integrity
`buildMultiNativeComposeToolCalls` SHALL always emit exactly three native calls in `MULTI_NATIVE_COMPOSE_ORDER`. Empty or adversarial extra keys SHALL NOT reorder the chain or inject a non-native tool.

## Requirement: Custody seals only on success
`hashToolOutputs` MAY hash partial outputs. `custodyReceipt` with status `COMPLETED` SHALL be attached only on the success path. Mid-chain failure SHALL NOT claim `COMPLETED` and SHALL omit `custodyReceipt`.

## Requirement: Dispatcher isolation
A pure-native compose SHALL NOT invoke `toolDispatcher.dispatch` even when a dispatcher is provided.

## Requirement: serverName spoof routing honesty
`isNativeGeminiToolCall({ serverName: 'eos-gemini', toolName: 'echo' })` SHALL be true. Execution SHALL fail-close via the Gemini bridge (`UNKNOWN_GEMINI_TOOL` → `GEMINI_TOOL_FAILED`) and SHALL NOT consult the MCP dispatcher.

## Requirement: Hermetic CI
Default tests SHALL inject `geminiQueryImpl`, `stitchClientImpl`, and `browserQaClientImpl`. Live cases MAY skip unless explicitly enabled.

## Requirement: Slim opt-in
The Mission O suite basename SHALL be listed in `SLIM_SUITE_EXCLUDES` and reachable via `npm run test:compute-worker-o`.
