# EOS CANONICAL MISSION STATE MODEL
**Document ID:** `SPEC-EOS-STATE-MODEL-2026`  
**Classification:** `CANONICAL_STATE_SPECIFICATION`  
**Owner:** `AuthorityTruthSource` (`src/core/authority/authority-truth-source.js`)  

---

## 1. Single Canonical State Definition

The lifecycle of every EOS mission is governed strictly by a single, persistent state machine owned exclusively by `AuthorityTruthSource` (ATS).

### The Canonical State Enum:
```text
VISION_INTAKE ──▶ DISCOVERY ──▶ PLAN ──▶ TASK_DAG ──▶ EXECUTION ──▶ VERIFICATION ──▶ REVIEW ──▶ CLOSE
     │                                                     ▲              │
     │                                                     │              │
     └───────────────────────────(RETRY / ROLLBACK)────────┴──────────────┘
```

| Canonical Phase | Description | Preconditions | Postconditions | Required Authority |
|---|---|---|---|---|
| `VISION_INTAKE` | Goal capture & initial profile ingestion | Valid string goal, target path exists | `direction.json` created, ATS initialized | `A0` (Director) |
| `DISCOVERY` | Project stack, dependencies & workspace discovery | Mission in `VISION_INTAKE` | `project-profile.json` generated | `A0` (Director) |
| `PLAN` | Formal EARS requirements & BDD scenarios | Mission in `DISCOVERY` | `spec.md`, `plan.md` created & schema valid | `A1` / `HITL_REQUIRED` |
| `TASK_DAG` | Atomic task graph decomposition | Mission in `PLAN` | `task-dag.json` topologically sorted | `A1` (Architect) |
| `EXECUTION` | Pure L0 implementation & scaffolding | Mission in `TASK_DAG` | Source code files created, clean git diff | `A1` (Engineer) |
| `VERIFICATION` | 100% logic test execution & static pureness audit | Mission in `EXECUTION` | Exit code 0, Tescohan clean, Triad balanced | `A1` (Verifier) |
| `REVIEW` | Executive evaluation & evidence consolidation | Mission in `VERIFICATION` | `evidence-receipt.json` signed | `A2` (Reviewer) |
| `CLOSE` | Mission finalization & lesson extraction | Mission in `REVIEW` | Mission sealed, state frozen | `A0` / `A2` (Director) |

---

## 2. Demotion of Secondary State Machines (Derived Views)

### The 7-Temple Heptaparaparshinokh Octave Mapping:
The 7 Temples are **strictly derived projections** of the canonical state, computed deterministically on-the-fly without holding private state:

$$\text{Temple}(\text{Phase}) = \begin{cases} 
\text{INTAKE\_GENESIS} & \text{if Phase} = \text{VISION\_INTAKE} \\
\text{SPEC\_CRYSTALLIZATION} & \text{if Phase} = \text{DISCOVERY} \lor \text{PLAN} \\
\text{ARCH\_GEOMETRY} & \text{if Phase} = \text{TASK\_DAG} \\
\text{TDD\_FRAGUA\_ROJO} & \text{if Phase} = \text{EXECUTION (Pre-Test)} \\
\text{TDD\_FRAGUA\_VERDE} & \text{if Phase} = \text{EXECUTION (Auto-Healed)} \\
\text{FDIR\_IMMUNIZATION} & \text{if Phase} = \text{VERIFICATION} \\
\text{CONSUMMATION\_SEAL} & \text{if Phase} = \text{REVIEW} \lor \text{CLOSE}
\end{cases}$$

### Persistent Physical Disk Invariant:
1. `mission-package.json` in `.missions/<mission_id>/` is the **only authoritative physical manifestation of current state**.
2. If `activeMissions` in RAM is cleared or the server restarts, the runtime re-reads `mission-package.json` and reconstructs the exact state deterministically.
3. RAM is treated strictly as an ephemeral cache; Disk is Truth.
