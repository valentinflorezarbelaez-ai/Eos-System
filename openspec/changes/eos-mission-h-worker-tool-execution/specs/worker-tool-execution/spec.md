# Spec — worker-tool-execution

## Requirement: Optional toolCalls
WHEN plan.toolCalls is empty, the worker SHALL proceed without a dispatcher.

## Requirement: Envelope gate
WHEN a toolCall targets a server absent from mcpEnvelope.resolvedServers, the run SHALL fail closed and SHALL NOT leave applied writes.

## Requirement: Evidence
WHEN tools execute successfully on COMPLETED, sealComputeRunCustody SHALL include tool_execution_hashes in the receipt payload.

## Requirement: CLI
The CLI SHALL parse `--dispatch-tool=<server>:<tool>:<json_args>` into toolCalls.
