# Design — Mission BT Dynamic Workflow State Machine & Step-Level Checkpoint Fabric (SPEC-0077)

## Overview

Layer-0 finite state machine and checkpointing fabric located in `src/core/orchestration/`.
Governs workflow execution lifecycle, step-level snapshots, and fail-closed state recovery.
Every lifecycle transition and checkpoint is cryptographically sealed as a `BT-RCPT-*` receipt.

## Components

1. **Receipt (`workflow-checkpoint-receipt.js`)**:
   Nine-field SHA-256 seal:
   `{ receiptId, workflowId, stepId, state, checkpointHash, status, timestamp, consensusSignature, prevReceiptHash }` → `BT-RCPT-*`
2. **Policy Gate (`workflow-checkpoint-policy-gate.js`)**:
   Allowed states: `INITIALIZED`, `RUNNING`, `PAUSED`, `CHECKPOINTED`, `COMPLETED`, `FAILED`, `ABORTED`.
   Fail-closed checks:
   - `ILLEGAL_STATE_TRANSITION_DENY`: Transition not permitted by FSM.
   - `TERMINAL_STATE_LOCKED_DENY`: Attempt to transition out of terminal state.
   - `CORRUPTED_CHECKPOINT_DENY`: Hash mismatch between checkpoint receipt and snapshot.
   - `MISSING_CHECKPOINT_DENY`: Checkpoint referenced does not exist.
   - `FUNDACION_ALWAYS_DENY`: Workflow context or target references forbidden Fundacion path.
   - `MALFORMED_WORKFLOW_DENY`: Missing workflow ID or invalid initial parameters.
3. **Port Facade (`dynamic-workflow-state-machine-port.js`)**:
   `createWorkflowStateMachinePort({ now, hash, policyGate })`
   - `initWorkflow({ workflowId, dag, initialContext })`: Initializes workflow.
   - `transitionState(workflowId, targetState, opts)`: Validates transition, updates state, seals receipt.
   - `checkpointStep(workflowId, stepId, stepPayload, opts)`: Records step snapshot, hashes context, transitions to `CHECKPOINTED`, seals receipt.
   - `restoreFromCheckpoint(workflowId, checkpointReceiptOrId)`: Validates snapshot integrity, rolls back context, returns restored state.
   - `getWorkflowState(workflowId)`: Inspects active state and context.
   - `verifyCheckpointTrail(receipts)`: Validates cryptographic chaining and receipt hashes.

## Constraints

- `PRODUCTION_READY=NO`; `Fundacion Δ=0`; Antigravity-first; Law VI clean.
- Zero external dependencies (`node:crypto` only).
- Hermetic test execution.

## NON-CLAIM

≠ AWS Step Functions · ≠ Temporal.io cluster · ≠ PRODUCTION_READY distributed orchestrator
