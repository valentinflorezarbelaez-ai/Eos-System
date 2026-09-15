# Proposal — Mission BT Dynamic Workflow State Machine & Step-Level Checkpoint Fabric (SPEC-0077)

## Problem Statement

Following Mission BR (Sovereign Intent Decomposition & DAG Decomposer) and Mission BS (Dynamic Agent Capability Matcher & Dispatcher Port), the EOS control plane can generate acyclic task DAGs and assign them to eligible agents.
However, workflow executions are vulnerable to intermediate step failure, uncheckpointed state loss, and uncontrolled state mutation.
Without a formal finite state machine (FSM) and step-level cryptographic checkpoint fabric:
1. Workflows can undergo illegal arbitrary state jumps (e.g. jumping from `COMPLETED` back to `RUNNING`).
2. Interrupted or failing multi-step processes cannot be restored to a proven, tamper-evident checkpoint.
3. Step execution outcomes lack cryptographic state snapshots verifying context immutability.

## Proposed Solution

Deliver **Mission BT (SPEC-0077)**:
1. A Layer-0 workflow finite state machine with strict state transitions (`INITIALIZED`, `RUNNING`, `PAUSED`, `CHECKPOINTED`, `COMPLETED`, `FAILED`, `ABORTED`).
2. A step-level checkpointing mechanism that snapshots workflow state and computes deterministic SHA-256 state digests.
3. Checkpoint restoration with tamper detection that rejects corrupted or modified snapshots.
4. Sealed `BT-RCPT-*` provenance receipts chained across the entire workflow lifecycle.
5. Strict fail-closed policy gating with `FUNDACION_ALWAYS_DENY`.

## Scope

- In Scope: Layer-0 state machine, transition validator, step checkpointing, state restoration, sealed receipts (`BT-RCPT-*`), hermetic tests, ADR, and evidence.
- Out of Scope: Distributed database engines, AWS Step Functions, Temporal.io, network services, production claim.
