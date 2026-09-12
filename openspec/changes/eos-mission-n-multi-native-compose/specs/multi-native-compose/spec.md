# Spec — multi-native-compose

## Requirement: Compose helper
`eos-compute-worker` SHALL export `MULTI_NATIVE_COMPOSE_ORDER = ['eos-gemini','eos-stitch','eos-browser-qa']` and `buildMultiNativeComposeToolCalls(opts)` returning ordered toolCalls: gemini_query → stitch_generate_screen → browser_qa_run.

## Requirement: Sequential composition
`executeComputeRun` SHALL execute multi-native toolCalls in plan/arg order via the existing dispatch loop. Mid-chain infra failure SHALL abort remaining calls, return the native-specific `*_TOOL_FAILED` status, and SHALL NOT call applyDiff after failure.

## Requirement: Soft QA in compose
Soft Browser QA failures (CWV/a11y) in a compose chain SHALL keep toolOutputs ok:true for the QA entry and SHALL allow applyDiff to proceed.

## Requirement: Hermetic CI
Default tests SHALL inject `geminiQueryImpl`, `stitchClientImpl`, and `browserQaClientImpl`.

## Requirement: Natives-only
A plan whose toolCalls are all native builtins SHALL NOT require `toolDispatcher`.

## Requirement: Order preservation
`normalizeToolCalls` SHALL preserve toolCalls order from plan or argument array.
