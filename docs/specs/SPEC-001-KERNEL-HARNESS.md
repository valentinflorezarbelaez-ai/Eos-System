# SPECIFICATION: SPEC-001 — KERNEL EXECUTION HARNESS & L0 SANDBOX

**Document ID:** `SPEC-001-KERNEL-HARNESS`  
**Mission:** `MIS-001-KERNEL-CORE`  
**Tier Level:** `Tier A (L0 - Pure Built-in Runtime)`  
**Status:** `DRAFT_PENDING_APPROVAL`  
**Epistemic Classification:** `NOT_VERIFIED`  
**Living Contract:** Zero untrusted dependencies (`DEPENDENCY_POLICY_L0.md`), deterministic `stdout`/`stderr` capture, and cryptographic evidence hashing (SHA-256).

---

## 1. System Overview & Scope
The Kernel Execution Harness provides an isolated, deterministic execution boundary for running system verification tasks, benchmarks, and sandboxed sub-processes. It relies strictly on Node.js built-in modules (`node:child_process`, `node:fs`, `node:crypto`, `node:path`, `node:readline`) without external third-party packages, guaranteeing clean-clone reproducibility and supply-chain immunity.

---

## 2. Requirements in Formal EARS Syntax

### 2.1 Ubiquitous Requirements
- **[REQ-EARS-UBI-01] Zero External Dependency Invariant**:  
  The system **shall** execute all harness and sandbox operations using solely Node.js native runtime APIs without calling `npm install` or importing non-built-in modules in Tier A.
- **[REQ-EARS-UBI-02] Cryptographic Hashing Invariant**:  
  The system **shall** compute and record a SHA-256 checksum for all input scripts, executed command lines, and captured standard output streams.

### 2.2 Event-Driven Requirements
- **[REQ-EARS-EVT-01] Sandboxed Sub-process Spawning**:  
  **WHEN** the harness receives a command execution request,  
  **THE SYSTEM SHALL** isolate the execution context within a designated ephemeral working directory with strict environment variable whitelisting (`PATH`, `NODE_OPTIONS`, `EOS_MODE`).
- **[REQ-EARS-EVT-02] Exit Code & Stream Capture**:  
  **WHEN** a sandboxed command completes execution,  
  **THE SYSTEM SHALL** capture the numeric exit code, full `stdout`, and full `stderr` without stream truncation or loss of trailing bytes.

### 2.3 State-Driven Requirements
- **[REQ-EARS-STA-01] Non-Blocking Stream Buffering**:  
  **WHILE** a sandboxed sub-process is active,  
  **THE SYSTEM SHALL** asynchronously buffer incoming data chunks to avoid deadlocks on stdout/stderr pipes.
- **[REQ-EARS-STA-02] Execution Timeout Enforcement**:  
  **WHILE** a process exceeds its designated execution budget (default: 10,000 ms),  
  **THE SYSTEM SHALL** transmit a `SIGTERM` signal, followed by a `SIGKILL` signal if unresponsive after 1,000 ms, returning status `TIMED_OUT`.

### 2.4 Unwanted / Error-Condition Requirements
- **[REQ-EARS-ERR-01] Non-Zero Exit Classification**:  
  **IF** a sandboxed command exits with a non-zero status code,  
  **THEN THE SYSTEM SHALL** classify the execution outcome as `EXECUTION_FAILED`, record the stderr trace, and emit an evidence record without crashing the parent harness.
- **[REQ-EARS-ERR-02] Illegal Path Traversal Prevention**:  
  **IF** an execution request attempts to access or mutate directories outside the authorized workspace root,  
  **THEN THE SYSTEM SHALL** reject the execution immediately with `ERROR_PATH_TRAVERSAL_PREVENTED`.

---

## 3. Detailed Acceptance Criteria in BDD (Gherkin)

```gherkin
Feature: L0 Kernel Execution Harness and Process Sandboxing
  As the EOS Mission OS Core
  I want an isolated, deterministic sub-process execution harness
  So that all commands, tests, and verification suites run safely with full cryptographic evidence

  Background:
    Given a pristine Node.js runtime environment complying with DEPENDENCY_POLICY_L0.md
    And no third-party npm dependencies loaded in Tier A memory

  Scenario: Deterministic command execution with zero exit code
    Given a valid execution request for command "node --check bin/eos.js"
    And an execution timeout budget of 5000 milliseconds
    When the Kernel Harness dispatches the command in an isolated sandbox
    Then the process exit code must be 0
    And the stdout stream must be captured completely
    And the stderr stream must be empty
    And an evidence manifest record must be generated with a valid SHA-256 hash
    And the epistemic status must be marked as "VERIFIED"

  Scenario: Command failure with non-zero exit code capture
    Given an execution request for a non-existent or failing script "node --eval 'process.exit(42)'"
    When the Kernel Harness executes the sandboxed process
    Then the process exit code must be 42
    And the execution status must be "EXECUTION_FAILED"
    And the evidence record must capture the non-zero exit code and timestamp
    And the parent harness must remain stable and unblocked

  Scenario: Process timeout termination and resource reclamation
    Given an execution request for a hanging command "node --eval 'setInterval(()=>{}, 1000)'"
    And a strict timeout limit of 500 milliseconds
    When the Kernel Harness monitors the process execution
    Then the process must be terminated automatically within 1500 milliseconds
    And the status returned must be "TIMED_OUT"
    And all child process handles must be closed cleanly

  Scenario: Rejection of illegal workspace path traversal
    Given an execution request targeting working directory "../../../Windows/System32"
    When the Kernel Harness validates the execution boundary
    Then the request must be rejected before process spawn
    And the reason must be "ERROR_PATH_TRAVERSAL_PREVENTED"
```

---

## 4. Interface Contract & Types

```typescript
export type EpistemicStatus = 
  | 'VERIFIED'
  | 'NOT_VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'BLOCKED'
  | 'ASSUMPTION'
  | 'RISK'
  | 'PRODUCTION_READY_WITHIN_TESTED_SCOPE';

export interface SandboxExecutionOptions {
  cwd?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
  maxBufferBytes?: number;
}

export interface SandboxExecutionResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  sha256Payload: string;
  epistemicStatus: EpistemicStatus;
  timestamp: string;
}
```
