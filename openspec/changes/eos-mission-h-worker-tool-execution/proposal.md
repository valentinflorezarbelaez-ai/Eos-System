# Proposal — Mission H: Worker Live Tool Execution Bridge (SPEC-0012)

## Why
Mission G delivered `McpToolDispatcher`. The compute worker still only projects MCP envelopes — it cannot execute live tool calls during a governed run.

## What
1. `executeComputeRun` accepts `toolDispatcher` + `toolCalls`; dispatches via envelope gate; fail-closed + rollback on failure; `result.toolOutputs`.
2. `sealComputeRunCustody` records `tool_execution_hashes` (SHA-256).
3. CLI `--dispatch-tool=<server>:<tool>:<json_args>`.
4. Suite `eos-compute-worker-mission-h.test.js`; slim-exclude; `test:compute-worker-h`.

## DoD
Branch `grok/mission-h-worker-tool-execution` from main@fa2b188; tests PASS; verify:strict EXIT 0; PRODUCTION_READY=NO.
