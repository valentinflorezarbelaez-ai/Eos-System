# Spec — browser-qa-worker-bridge

## Requirement: Native routing
`executeComputeRun` SHALL route `browser_qa_run` and `serverName=eos-browser-qa` through `executeBrowserQaTool`, bypassing MCP stdio.

## Requirement: Soft vs infra
Soft QA failures (CWV/a11y) SHALL be delivered as tool result reports without aborting applyDiff. Infra errors SHALL return BROWSER_QA_TOOL_FAILED, invoke rollbackDiff when provided, and SHALL NOT call applyDiff after failure.

## Requirement: Hermetic CI
Default tests SHALL inject browserQaClientImpl.

## Requirement: Builtin discovery
`listBuiltinComputeTools` SHALL include Gemini, Stitch, and Browser QA tools.
