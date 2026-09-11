# Spec — SPEC-0010 Worker MCP Integration

## Requirement (EARS)

WHEN a compute plan is built for APPLY
THE SYSTEM SHALL attach `plan.mcpEnvelope` from `McpCapabilityRouter.resolveMcpEnvelope` using phase APPLY and task-derived capability annotations.

WHEN `executeComputeRun` is invoked with `enforceMcp: true` AND the envelope status is DEFICIENT
THE SYSTEM SHALL abort with `status: 'MCP_CAPABILITY_DEFICIENT'` BEFORE invoking `applyDiff`.

WHEN a COMPLETED run seals EvidenceCustody
THE SYSTEM SHALL include `mcp_envelope` in the `sealVerifyReceipt` payload.

WHEN the CLI is invoked with `--mcp-check`
THE SYSTEM SHALL print the capability projection and exit 0.

WHEN the CLI is invoked with `--enforce-mcp` AND capabilities are DEFICIENT
THE SYSTEM SHALL exit with code 4.

THE SYSTEM SHALL NOT mutate `src/core`.
THE SYSTEM SHALL keep `PRODUCTION_READY=NO` and Fundacion Δ=0.

## Scenario — plan carries mcpEnvelope

GIVEN checkbox tasks including `@needs(VCS)`
WHEN `buildComputePlan` runs with phase APPLY projection
THEN `plan.mcpEnvelope.schema` is `eos.mcp_capability_envelope.v1`
AND `plan.mcpEnvelope.phase` is `APPLY`
AND `plan.mcpEnvelope.PRODUCTION_READY` is `NO`

## Scenario — enforceMcp aborts before diff

GIVEN a plan whose `mcpEnvelope.status` is `DEFICIENT`
AND `enforceMcp: true`
WHEN `executeComputeRun` starts
THEN `applyDiff` is never called
AND result.status is `MCP_CAPABILITY_DEFICIENT`
AND result.ok is false

## Scenario — custody includes mcp_envelope

GIVEN a COMPLETED run with a resolved `plan.mcpEnvelope`
WHEN `sealComputeRunCustody` seals the verify receipt
THEN the receipt payload contains `mcp_envelope`
AND `receipt_hash` covers that field

## Scenario — CLI --mcp-check

GIVEN `--change=<id>` and `--mcp-check`
WHEN the CLI runner finishes
THEN exitCode is 0
AND the capability projection is emitted

## Scenario — CLI --enforce-mcp DEFICIENT

GIVEN `--enforce-mcp` and tasks requiring an unavailable capability
WHEN the CLI runner finishes
THEN exitCode is 4
AND no apply diffs were performed
