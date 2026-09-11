# Spec — stitch-worker-bridge

## Requirement: Native routing
`executeComputeRun` SHALL route `stitch_*` tool names and `serverName=eos-stitch` through `executeStitchTool`, bypassing MCP stdio.

## Requirement: Fail-closed
Stitch tool failures SHALL return status STITCH_TOOL_FAILED, invoke rollbackDiff when provided, and SHALL NOT call applyDiff after failure.

## Requirement: Hermetic CI
Default tests SHALL inject stitchClientImpl. Live Stitch SHALL NOT be required.

## Requirement: Builtin discovery
`listBuiltinComputeTools` SHALL include Gemini tools and Stitch tools.
