# Specification — Mission BT Dynamic Workflow State Machine & Step-Level Checkpoint Fabric (SPEC-0077)

## Requirements (EARS)

### REQ-EARS-BT-01: Hermetic Workflow Lifecycle Initialization
WHEN a workflow execution is initialized with a unique workflow ID and task DAG,
THE SYSTEM SHALL record the workflow in the `INITIALIZED` state, initialize an empty execution context,
and seal a provenance receipt (`BT-RCPT-*`).

### REQ-EARS-BT-02: Strict State Transition Enforcement
WHEN a state transition is requested for an active workflow,
THE SYSTEM SHALL validate the transition against allowed transition paths,
and REJECT any illegal transition with error code `ILLEGAL_STATE_TRANSITION_DENY`.

### REQ-EARS-BT-03: Step-Level Cryptographic Checkpointing
WHEN an individual task step completes or requires state persistence,
THE SYSTEM SHALL compute a deterministic SHA-256 snapshot digest of the workflow context,
transition state to `CHECKPOINTED`, and emit a sealed checkpoint receipt containing step ID and snapshot hash.

### REQ-EARS-BT-04: Tamper-Evident State Restoration
WHEN a workflow restoration is requested from a recorded checkpoint,
THE SYSTEM SHALL verify the checkpoint hash against the restored snapshot data,
and REJECT restoration with error code `CORRUPTED_CHECKPOINT_DENY` if data has been altered.

### REQ-EARS-BT-05: Terminal State Immutability
IF a workflow reaches a terminal state (`COMPLETED`, `FAILED`, or `ABORTED`),
THE SYSTEM SHALL prevent any further state transitions or checkpoint mutations,
returning `TERMINAL_STATE_LOCKED_DENY`.

## BDD Acceptance Criteria

### SCENARIO 1: Happy Path Workflow Lifecycle & Checkpointing
GIVEN an initialized workflow with a valid DAG
WHEN step 1 completes and `checkpointStep` is called
THEN a sealed checkpoint receipt starting with `BT-RCPT-` is created
AND the workflow context contains the step snapshot digest.

### SCENARIO 2: Rejection of Illegal State Transition
GIVEN a workflow in `INITIALIZED` state
WHEN a transition to `COMPLETED` is requested directly without running
THEN the transition is rejected with `ILLEGAL_STATE_TRANSITION_DENY`
AND the workflow state remains `INITIALIZED`.

### SCENARIO 3: Tampered Checkpoint Restoration Rejection
GIVEN a valid recorded checkpoint with a known hash
WHEN an operator attempts to restore state using tampered snapshot data
THEN the restoration is denied with `CORRUPTED_CHECKPOINT_DENY`
AND the active workflow state is not corrupted.
