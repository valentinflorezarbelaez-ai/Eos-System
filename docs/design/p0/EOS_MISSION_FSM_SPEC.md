# EOS MISSION FINITE STATE MACHINE SPECIFICATION
**Document ID:** `SPEC-EOS-FSM-2026`  
**Classification:** `FSM_FORMAL_SPECIFICATION`  
**Enforcer:** `AuthorityTruthSource.commitTransition()`  

---

## 1. Formal FSM Transition Matrix

Any transition not explicitly listed with $\text{ALLOWED} = \text{TRUE}$ is strictly forbidden and must fail closed with `INVALID_FSM_TRANSITION`.

```text
+--------------------+----------------------+-------------------+-----------------------+
| Current State      | Target State         | Allowed Condition | Authority Required    |
+--------------------+----------------------+-------------------+-----------------------+
| VISION_INTAKE      | DISCOVERY            | Always            | A0                    |
| DISCOVERY          | PLAN                 | Profile Created   | A0                    |
| PLAN               | TASK_DAG             | Valid HITL Receipt| A1 + Human Approval   |
| TASK_DAG           | EXECUTION            | DAG Acyclic       | A1                    |
| EXECUTION          | VERIFICATION         | Code Generated    | A1                    |
| VERIFICATION       | REVIEW               | 100% Tests Pass   | A1                    |
| REVIEW             | CLOSE                | Evidence Signed   | A2                    |
| VERIFICATION       | EXECUTION (Rollback) | Test/Audit Fail   | A1 (FDIR Recovery)    |
| REVIEW             | PLAN (Refinement)    | Human Rejection   | A2 (Human Rejection)  |
| ANY_ACTIVE_STATE   | PAUSED               | Manual Intervene  | A0                    |
| PAUSED             | RESUMED_STATE        | Resumed by Owner  | A0                    |
+--------------------+----------------------+-------------------+-----------------------+
```

---

## 2. Inviolable FSM Invariants

1. **No Direct Mutation:**  
   `mission.currentPhase = 'PLAN'` or `pkg.phase = '...'` assignments in source code are prohibited and intercepted by static AST linter (`verify:strict`).
2. **Transition Monotonicity:**  
   State cannot jump across intermediate phases (e.g. `VISION_INTAKE` $\rightarrow$ `EXECUTION` is blocked).
3. **Atomic Rollback Contract:**  
   If a transition from `EXECUTION` $\rightarrow$ `VERIFICATION` fails, `rollbackOctave` physically unlinks newly scaffolded files and sets state to `TASK_DAG` with an immutable rollback event appended to the ledger.
4. **Idempotent Transition Dispatch:**  
   Submitting an identical transition with an already processed `event_id` is a no-op returning the existing sealed receipt.
