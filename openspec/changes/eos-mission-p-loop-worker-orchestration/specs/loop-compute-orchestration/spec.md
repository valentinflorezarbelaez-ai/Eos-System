# Spec — loop-compute-orchestration (SPEC-0021)

## Requirement: Governed Act-stage compute

The system SHALL advance the MCP Mission Loop only via legal adjacency
(`evaluateStageTransition`) and SHALL invoke `executeComputeRun` only when the
loop stage is **Act**.

### Scenario: Happy path Archives with receipts

- GIVEN a hermetic multi-native compose (gemini → stitch → browser_qa)
- WHEN `runLoopComputeOrchestration` runs with verify ok
- THEN stage reaches Archive and receipts include act, evidence, and verify kinds

### Scenario: Illegal skip denied

- GIVEN loop state at Plan
- WHEN advancing to Evidence
- THEN `ILLEGAL_STAGE_TRANSITION` is returned and stage is unchanged

### Scenario: Infra fail never Archives

- GIVEN geminiQueryImpl throws
- WHEN orchestration runs
- THEN status is `GEMINI_TOOL_FAILED`, applyDiff is not called, stage stays Act

### Scenario: Soft QA requires HITL before Archive

- GIVEN Browser QA toolOutputs ok:true with result.ok===false
- WHEN no hitlReceipt.ok
- THEN status is `ARCHIVE_REQUIRES_HITL_SOFT_QA` and hitlRequired is true
- WHEN hitlReceipt.ok===true
- THEN Archive is allowed

### Scenario: Verify failure blocks Archive

- GIVEN runVerifier returns ok:false
- THEN a verify receipt with ok:false is recorded and `assertArchiveAllowed` denies Archive

### Scenario: Evidence gate

- GIVEN Evidence stage with no evidence receipt
- WHEN advancing to Verify
- THEN `VERIFY_REQUIRES_EVIDENCE`

## Requirement: PRODUCTION_READY remains NO

`LOOP_COMPUTE_ORCHESTRATOR_PRODUCTION_READY` SHALL equal `'NO'`.
