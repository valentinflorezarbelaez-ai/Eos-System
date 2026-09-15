# ADR-0037 — Mission BT Dynamic Workflow State Machine & Step-Level Checkpoint Fabric

- **Status:** Accepted — local governed
- **Date:** 2026-09-15
- **Deciders:** EOS local governed use (Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric)
- **Spec:** SPEC-0077

## Context

Ladder 22 audit ordered BR→BV under the axis **Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric**.
L17 through L21 remain CLOSED_FOR_LOCAL_GOVERNED_USE and must never be reopened.
Ladder 22 is OPEN (Mission BR and BS completed; Mission BT in progress; BU–BV pending).

Following Mission BR (Sovereign Intent Decomposition) and Mission BS (Dynamic Agent Capability Matcher & Dispatcher Port),
EOS required a formal finite state machine (FSM) to govern workflow execution lifecycles, enforce legitimate state transitions,
prevent illegal state jumps, and provide step-level cryptographic checkpointing with tamper-evident state restoration.
The **Dynamic Workflow State Machine & Step-Level Checkpoint Fabric** implements strict lifecycle governance and
seals every transition and checkpoint snapshot under cryptographic custody (`BT-RCPT-*`).

## Decision

1. Implement three Layer-0 modules under `src/core/orchestration/`:
   - `workflow-checkpoint-receipt.js`: Canonical nine-field SHA-256 sealed receipts (`BT-RCPT-*`) via `node:crypto`.
   - `workflow-checkpoint-policy-gate.js`: Fail-closed policy gate enforcing `ILLEGAL_STATE_TRANSITION_DENY`, `TERMINAL_STATE_LOCKED_DENY`, `CORRUPTED_CHECKPOINT_DENY`, `MISSING_CHECKPOINT_DENY`, and `FUNDACION_ALWAYS_DENY`.
   - `dynamic-workflow-state-machine-port.js`: Unified port facade (`createWorkflowStateMachinePort`, `initWorkflow`, `transitionState`, `checkpointStep`, `restoreFromCheckpoint`, `getWorkflowState`, `verifyCheckpointTrail`).
2. Enforce strict FSM lifecycle graph:
   - `INITIALIZED` → `RUNNING`, `ABORTED`
   - `RUNNING` → `CHECKPOINTED`, `PAUSED`, `COMPLETED`, `FAILED`, `ABORTED`
   - `CHECKPOINTED` → `RUNNING`, `COMPLETED`, `FAILED`, `ABORTED`
   - `PAUSED` → `RUNNING`, `ABORTED`
   - Terminal states (`COMPLETED`, `FAILED`, `ABORTED`) are strictly immutable and locked.
3. Compute deterministic SHA-256 state snapshot digests on every step checkpoint.
4. Verify checkpoint integrity prior to state restoration, immediately rejecting corrupted or modified snapshot data.
5. Invariants preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0` (ALWAYS_DENY), Antigravity-first, zero hardcoded secrets (Law VI).
6. Exclude satellite test suite `tests/eos-bt-workflow-state-machine-checkpoint-port.test.js` from default test discovery (`SLIM ≤ 145`) via `scripts/test-runner.js` and provide dedicated opt-in `npm run test:mission-bt`.

## Alternatives considered AND REJECTED

### A. Ad-hoc Workflow Status Flags
**Rejected.** Storing workflow state as loose, unstructured string properties without transition validation allows
arbitrary state jumps (e.g., executing tasks on an already aborted or completed workflow).
Technical reason: A formal FSM with fail-closed transition gating guarantees mathematical correctness and execution integrity.

### B. Heavy Cloud Orchestrator (AWS Step Functions / Temporal.io)
**Rejected.** External cloud orchestrators introduce massive operational dependencies, latency, external network reliance,
and SaaS billing/credentials.
Technical reason: EOS operates a local governed control plane requiring microsecond in-memory determinism and Layer-0 cryptographic receipts.

## Consequences

- **Positive:** Deterministic workflow lifecycle governance; immutable terminal state locking; tamper-evident checkpointing and rollback; cryptographic `BT-RCPT-*` provenance receipts.
- **Negative:** Workflows must follow strict state transition rules; illegal jumps fail closed immediately.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, zero hardcoded secrets (Law VI).
