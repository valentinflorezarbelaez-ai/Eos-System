# Specification — Mission BS Dynamic Agent Capability Matcher & Governed Dispatcher Port (SPEC-0076)

## Requirements (EARS)

### REQ-EARS-BS-01: Hermetic Agent Profile Registration
WHEN an agent profile is registered with the capability matcher,
THE SYSTEM SHALL record the agent's unique ID, declared capabilities array, security clearance level,
and assigned operational role, and validate that all capability strings are well-formed.

### REQ-EARS-BS-02: Deterministic Capability Matching
WHEN a task node from an approved DAG requests execution assignment,
THE SYSTEM SHALL match the task's required capability tag against registered agent capability profiles,
selecting the highest-clearance attested agent eligible for the role.

### REQ-EARS-BS-03: Fail-Closed Dispatch Denial on Uncertified Roles
IF a task node requires a capability not possessed by any registered agent,
or if the assigned agent fails identity attestation,
THE SYSTEM SHALL DENY the dispatch immediately, emit an error code `UNCERTIFIED_CAPABILITY_DENY`
or `UNATTESTED_AGENT_DENY`, and seal a diagnostic failure receipt.

### REQ-EARS-BS-04: Batch Topological DAG Dispatch
WHEN an entire validated DAG from Mission BR is submitted for batch dispatch,
THE SYSTEM SHALL dispatch tasks in strict topological order,
ensuring prerequisites are scheduled prior to dependent downstream nodes,
and sealing a distinct `BS-RCPT-*` receipt for each node assignment.

### REQ-EARS-BS-05: Cryptographically Sealed Dispatch Receipts (BS-RCPT-*)
WHEN an assignment is processed or denied,
THE SYSTEM SHALL emit an immutable sealed receipt (`BS-RCPT-*`) containing receipt ID, task ID,
agent ID, required capability, matched capability, status (`DISPATCHED` or `DENIED`), ISO timestamp,
and SHA-256 checksum over the canonical nine fields.

## BDD Acceptance Criteria

### SCENARIO 1: Happy Path Matching and Task Dispatch
GIVEN registered agents with `execution.core` and `verification.sensor` capabilities
WHEN a task requiring `execution.core` is dispatched
THEN the matching agent is assigned
AND a sealed receipt starting with `BS-RCPT-` and status `DISPATCHED` is emitted.

### SCENARIO 2: Fail-Closed Denial on Uncertified Capability
GIVEN a task node requiring `quantum.hypercomputing`
WHEN no registered agent possesses this capability
THEN the dispatch returns `UNCERTIFIED_CAPABILITY_DENY`
AND a sealed failure receipt is preserved under evidence custody.

### SCENARIO 3: Topological Batch Dispatch of Mission BR DAG
GIVEN an approved DAG from Mission BR containing 4 sequential tasks
WHEN `batchDispatchDag` is executed
THEN all 4 tasks are dispatched in exact topological sequence
AND 4 cryptographically chained receipts are verified.
