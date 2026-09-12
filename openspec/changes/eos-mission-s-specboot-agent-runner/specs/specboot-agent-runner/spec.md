# Spec — specboot-agent-runner (SPEC-0024)

## Requirement: Governed SpecBoot phase runner

The system SHALL expose a SpecBoot agent runner with phases PROPOSE | APPLY |
VERIFY | ARCHIVE | COMMIT_READY. `runCycle` SHALL walk those phases in order.
COMMIT_READY SHALL mean ready-for-HITL-PR and SHALL NOT push or merge main.

### Scenario: Invalid change fail-closed

- GIVEN proposal text missing OR tasks markdown with zero checkboxes
- WHEN `runCycle` / `loadChange` is invoked
- THEN it throws `SpecbootAgentRunnerError` with code `SPECBOOT_CHANGE_INVALID`

### Scenario: Apply dispatches pending tasks

- GIVEN a loaded change with pending `- [ ]` tasks and injected `runOrchestration`
- WHEN APPLY runs
- THEN each pending task invokes `runOrchestration` exactly once
- AND evidence receipts are written
- AND on first orchestration failure, APPLY stops with `SPECBOOT_APPLY_FAILED`

### Scenario: Verify requires evidence

- GIVEN no evidence receipts
- WHEN VERIFY runs
- THEN it throws with code `SPECBOOT_VERIFY_REQUIRES_EVIDENCE`

### Scenario: Archive and commit are HITL-safe

- GIVEN VERIFY succeeded
- WHEN ARCHIVE runs
- THEN `archiveChange` meta has `mergedToMain=false` / `gitMergeMain=false`
- AND COMMIT_READY returns `pushed=false`, `hitlPublishRequired=true`

## Requirement: Distinct from CloudAgent and AGY ceremony replacement

`health().kind` SHALL equal `eos-specboot-agent-runner`. Module docs SHALL
include a NON-CLAIM that this does not replace `node bin/eos.js` / AGY skills
wholesale, does not use CloudAgent, and does not autonomously merge main.

## Requirement: PRODUCTION_READY remains NO

`SPECBOOT_AGENT_RUNNER_PRODUCTION_READY` SHALL equal `'NO'`.
