# EOS SDD Transition Policy

**Status:** Canonical Transition Policy
**Authority:** LEVEL_0 / MCL-0
**Scope:** All EOS state transitions, orchestration events, and subagent dispatches

## 1. Core Principles

1. **Deterministic Evaluation**: State transitions are evaluated by pure deterministic code against the Canonical Transition Table. No Large Language Model or agent inference can approve a transition.
2. **Fail-Closed Governance**: Any validation failure, ambiguous input, expired receipt, or unmapped state immediately halts execution and emits a structured `TransitionError`.
3. **Monotonic Authority**: Authority level cannot be escalated beyond the parent mission contract.
4. **Epistemic Evidence Integrity**: Only real, verified logs with SHA-256 hashes satisfy exit criteria. `SIMULATION_ONLY` results cannot satisfy verification gates.
5. **No Self-Approval**: Authors cannot review or approve their own high-risk tasks.
6. **Zero Replay**: Non-idempotent transition events with existing `idempotency_key` or `event_id` are rejected immediately.

---

## 2. Policy Enforcements

### 2.1 Authority and Gate Enforcement
- Transitions from `HUMAN_DIRECTION_GATE` to `DISCOVER` require a valid, unexpired HITL receipt signed by `human_owner` or `delegated_human`.
- Transitions from `HUMAN_RELEASE_GATE` to `OPERATE_AND_LEARN` require an explicit `hitl-release-receipt` with valid cryptographic/hash audit trail.
- Transitioning to `SUPERVISE` with mutating tasks requires `LEVEL_1` or higher explicitly granted in the active receipt.

### 2.2 Write Barrier & Protected Surface Guard
- The Enforcer verifies that all target files in a task remain strictly inside `allowed_edit_roots`.
- Target files intersecting `protected_surfaces` (`src/core/`, `.git/`, `CONSTITUTION.md`, etc.) trigger immediate `PROTECTED_SURFACE_VIOLATION` and mission pause/escalation.

### 2.3 Budget Guard
- Each transition event evaluates the budget snapshot.
- If `tokens_consumed > max_input_tokens + max_output_tokens` or `duration_seconds > max_duration_seconds`, the transition is rejected with `BUDGET_EXHAUSTED`.

### 2.4 Error Diagnostics
When a transition fails, EOS emits a structured error:

```json
{
  "schema_version": "1.0.0",
  "error_id": "ERR-01HZ901234",
  "code": "EXPIRED_HITL_RECEIPT",
  "field": "receipt_ref.expires_at",
  "expected": "> 2026-08-20T10:00:00Z",
  "observed": "2026-08-20T09:00:00Z",
  "next_action": "Request renewed HITL receipt from Human Director",
  "mission_id": "MIS-SDD-KERNEL-001",
  "timestamp": "2026-08-20T10:00:00Z"
}
```

---

## 3. Control Operations

### 3.1 Pause & Checkpoint
Any active state may transition to `PAUSED` upon receiving `mission.pause`. The current state snapshot and ledger offset are saved with a SHA-256 hash.

### 3.2 Resume
A `PAUSED` mission can only resume to its previous active state with `mission.resume`, verifying the snapshot hash.

### 3.3 Cancellation & Kill Switch
Any state may transition to `CANCELLED` via `mission.cancel`. The engine trips the write barrier and executes rollback if needed.
