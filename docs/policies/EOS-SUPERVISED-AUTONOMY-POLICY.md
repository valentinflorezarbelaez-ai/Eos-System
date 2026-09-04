# EOS Supervised Autonomy Policy

**Status:** Canonical Autonomy Policy
**Authority:** LEVEL_0 / MCL-0
**Scope:** All EOS autonomous orchestrations, agent dispatchers, and gate evaluations

---

## 1. Fundamental Rule of Autonomy

> **EOS acts autonomously within the approved contract, but NEVER self-authorizes outside that boundary.**

The Human Director sets the mission vision, defines constraints, and approves gates. Within those bounds, EOS autonomously plans, assigns agents, executes tasks, inspects outputs, runs tests, and diagnoses failures without asking for micro-approvals.

---

## 2. Autonomy Modes

| Mode | Allowed Autonomous Actions | Forbidden Actions (Require Gate) |
|---|---|---|
| **`READ_ONLY_AUTONOMOUS`** | Workspace discovery, AST parsing, context compilation, draft specification creation, read-only test verification. | Any file write or tool mutation. |
| **`LOCAL_BOUNDED_AUTONOMY`** | File creation/edits strictly inside `allowed_edit_roots`, local test execution, local refactoring within token/time budgets. | Writes to `protected_surfaces`, scope expansion, network operations, external tool execution. |
| **`STAGED_AUTONOMY`** | Automated testing and deployment in isolated staging environments. | Production deployment, real database mutation. |
| **`PRODUCTION_SUPERVISED`** | Telemetry observation and read-only health monitoring in production. | Any production code release or mutating action without active, unexpired HITL receipt. |

---

## 3. Decision Routing Rules

### 3.1 Delegated Routine (Auto-Execute)
- Reading and indexing files.
- Compiling token-budgeted context.
- Executing unit and lint test suites locally.
- Formulating draft specs, plans, and task DAGs.
- Retrying transient tool failures within the retry budget.

### 3.2 Approval Required (Pause & Present Options)
- Tradeoffs between performance and architectural complexity.
- Minor adjustment to task dependencies.
- Requesting token or duration budget extensions (< 20%).

### 3.3 Human Only (Hard Halt)
- Initial mission direction approval (`HUMAN_DIRECTION_GATE`).
- Final software release approval (`HUMAN_RELEASE_GATE`).
- Modifying protected roots (`src/core/`, `.git/`, `CONSTITUTION.md`).
- Accessing or modifying API keys, credentials, or secrets.
- External messaging or publishing.
- Exceptions to constitutional governance rules.
