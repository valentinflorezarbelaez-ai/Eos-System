# EOS Mission Status Report: [MISSION_ID]

* **Mission Title:** [Mission Objective / Title]
* **Current State:** `[FSM_STATE]`
* **Operational Mode:** `[READ_ONLY_AUTONOMOUS | LOCAL_BOUNDED_AUTONOMY | STAGED_AUTONOMY | PRODUCTION_SUPERVISED]`
* **Authority Level:** `[LEVEL_0 .. LEVEL_4]`
* **Generated At:** `[ISO_TIMESTAMP]`

---

## 1. Executive Summary & Intent
- **Human Vision Reference:** `[URI_OR_SHA256]`
- **Approved Scope (Included):** `[LIST]`
- **Approved Scope (Excluded):** `[LIST]`
- **Current Progress:** `[X / Y Tasks Completed]`

---

## 2. Organization & Task Graph
| Task ID | Assigned Role | Assigned Agent | Status | Budget Consumed | Stop Condition Met? |
|---|---|---|---|---|---|
| `TASK-001` | `implementer` | `agent-coder-01` | `COMPLETED` | 2,400 tokens / 3 calls | YES |
| `TASK-002` | `tester` | `agent-tester-01` | `RUNNING` | 1,100 tokens / 1 call | IN_PROGRESS |

---

## 3. Tool & Runtime Realism
| Tool Name | Invocations | Tool Nature | Epistemic Impact |
|---|---|---|---|
| `replace_file_content` | 3 | `REAL_LOCAL` | Mutated local worktree |
| `execute_test_runner` | 1 | `REAL_LOCAL` | Produced raw test output |
| `mock_payment_api` | 0 | `SIMULATION_ONLY` | Blocked from verified evidence |

---

## 4. Verification & Evidence Register
| Evidence ID | Category | Status | Command / Source | SHA-256 Hash |
|---|---|---|---|---|
| `EVD-001` | `UNIT_TEST` | `VERIFIED` | `node --test tests/sdd-kernel-contracts.test.js` | `[64-HEX]` |
| `EVD-002` | `SECURITY_AUDIT` | `VERIFIED` | `barrier_check` | `[64-HEX]` |

---

## 5. Budget Accounting & Resource Burn
- **Tokens (Input / Output):** `[USED] / [MAX_ALLOWED]` (`[PERCENTAGE]%`)
- **Tool Calls:** `[USED] / [MAX_ALLOWED]`
- **Elapsed Duration:** `[SECONDS]s / [MAX_ALLOWED]s`
- **Remaining Retries:** `[N]`

---

## 6. Risks, Unknowns & Deviations
- **Discovered Risks:** `[None | Description + Mitigation]`
- **Unknown Register:** `[Resolved: X | Open: Y]`
- **Remediations & Retries:** `[Count + Rationale]`

---

## 7. Outcomes & Next Action
- **Technical Correctness Verdict:** `[VERIFIED_PASS | IN_PROGRESS | BLOCKED]`
- **Business Outcome Statement:** `[Explicitly separated from technical passes — Pending real experiment / telemetry]`
- **Next Required Action:** `[Autonomous Continuation | PAUSE for Gate G02]`
- **Required Authority for Next Step:** `[LEVEL_X]`
