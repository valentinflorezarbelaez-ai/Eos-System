# Specification — Mission BR Sovereign Intent Parser & Atomic Task DAG Decomposer Port (SPEC-0075)

## Requirements (EARS)

### REQ-EARS-BR-01: Hermetic Intent Parsing & Goal Normalization
WHEN an operator or agent submits an operational intent string to the intent parser,
THE SYSTEM SHALL extract the normalized goal description, identify explicit target artifacts,
detect stated constraints, and generate a stable deterministic intent hash (`SHA-256`).

### REQ-EARS-BR-02: Deterministic Atomic Task DAG Decomposition
WHEN a valid normalized intent is decomposed,
THE SYSTEM SHALL generate an acyclic directed graph consisting of discrete atomic task nodes,
where each node defines a unique identifier, required capability tag, and explicit prerequisite array.

### REQ-EARS-BR-03: Fail-Closed Cycle Detection & Dependency Validation
IF a task graph contains cyclical dependencies (e.g. A depends on B and B depends on A),
or references non-existent upstream prerequisites,
THE SYSTEM SHALL DENY the decomposition, halt processing immediately,
and return a failure status with error code `CYCLICAL_DEPENDENCY_DETECTED` or `MISSING_PREREQUISITE`.

### REQ-EARS-BR-04: Cryptographically Sealed Decomposition Receipt (BR-RCPT-*)
WHEN an intent decomposition is completed or denied,
THE SYSTEM SHALL emit an immutable sealed receipt (`BR-RCPT-*`) containing receipt ID, intent ID,
raw intent hash, node count, edge count, status (`VALIDATED` or `DENIED`), ISO timestamp, and SHA-256 checksum.

### REQ-EARS-BR-05: External Write Barrier & Scope Containment
IF an intent attempts to declare mutation targets within `Documents/Fundacion` without verified Level 2 authorization,
THE SYSTEM SHALL trigger `FUNDACION_ALWAYS_DENY` and reject the DAG generation.

## BDD Acceptance Criteria

### SCENARIO 1: Happy Path Intent Decomposition & Topological Validation
GIVEN a valid operational intent "Build, test, and seal Mission BR"
WHEN `parseIntent` and `decomposeTaskDag` are executed
THEN a valid DAG with 3+ atomic nodes is produced
AND topological sorting confirms zero cycles
AND a sealed receipt starting with `BR-RCPT-` and status `VALIDATED` is generated.

### SCENARIO 2: Fail-Closed Cyclical Dependency Rejection
GIVEN an intent whose task graph contains circular prerequisite links (Node A -> Node B -> Node A)
WHEN `validateDagTopology` is executed
THEN the policy gate throws or returns status `DENIED` with reason `CYCLICAL_DEPENDENCY_DETECTED`
AND no executable plan is released.

### SCENARIO 3: Scope Violation Rejection
GIVEN an intent targeting mutations in `C:/Users/valen/Documents/Fundacion`
WHEN `decomposeTaskDag` evaluates target boundaries
THEN the gate returns `FUNDACION_ALWAYS_DENY`
AND Fundacion Δ=0 invariant is preserved.
