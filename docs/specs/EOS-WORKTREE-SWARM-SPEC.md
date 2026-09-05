# [SPEC-EOS-010]: Git Worktree Swarm & Isolated Multi-Agent Session Orchestrator (`eos swarm`)

* **Domain / Module:** `src/core/orchestration/worktree-swarm-orchestrator.js` & `src/cli/mission-cli.js`
* **Status:** `APPROVED`
* **Traceability:** `GOV-SWARM-001` ➔ `SPEC-EOS-010` ➔ `PLAN-EOS-010` ➔ `TASKS-EOS-010`

---

## 1. Problem Statement & Operational Doctrine

Running multiple AI coding agents sequentially or within a shared working directory causes severe state contention: file-lock conflicts, uncommitted git index collisions, and linter race conditions. 

Inspired by **Boris Cherny's (Creator and Head of Claude Code at Anthropic) Massive Parallelism Doctrine**:
1. **Isolated Worktree Checkouts**: Agents operate in isolated filesystem directories created via `git worktree add`, running on dedicated ephemeral branches (`eos/swarm/<task-id>`).
2. **Zero Index Contention**: Each agent has its own index and working tree, enabling concurrent builds, edits, and test runs without polluting the main working copy.
3. **Byzantine Arbitration Reconciler**: When an agent completes its task, the worktree is not merged blindly. It must execute local verification tests and pass the **Multi-Agent Consensus & Arbitration Council (`SPEC-EOS-008`)** with zero vetoes before merging back into `main`.
4. **Deterministic Garbage Collection**: Once reconciled or rejected, worktrees are pruned (`git worktree remove`) to maintain zero disk and repository bloat.

---

## 2. Architectural Topology

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    JOINT OPERATIONS TACTICAL DISPATCH                   │
│                      (eos ops dispatch / eos swarm)                     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│        WORKTREE SWARM ORCHESTRATOR (src/core/orchestration/)            │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│ Worktree 1      │         │ Worktree 2      │         │ Worktree N      │
│ .eos/worktrees/ │         │ .eos/worktrees/ │         │ .eos/worktrees/ │
│ task-sec-01     │         │ task-arch-02    │         │ task-ui-03      │
│ Branch: swarm-1 │         │ Branch: swarm-2 │         │ Branch: swarm-N │
└────────┬────────┘         └────────┬────────┘         └────────┬────────┘
         │                           │                           │
         │ (Independent Execution & Test Verification exitCode 0)│
         └───────────────────────────┼───────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ BYZANTINE ARBITRATION & RECONCILIATION GATE (SPEC-EOS-008)              │
│ - Security Desk VETO Check                                              │
│ - Architecture Desk VETO Check                                          │
│ - Independent Verifier exitCode 0 Check                                 │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                        ┌────────────┴────────────┐
                     [APPROVED]               [REJECTED]
                        │                         │
                        ▼                         ▼
┌──────────────────────────────────────┐┌────────────────────────────────┐
│ FAST-FORWARD / MERGE TO MAIN         ││ REJECT & LOG FAILURE JOURNAL   │
│ Prune worktree & branch safely       ││ Prune worktree & alert healer  │
└──────────────────────────────────────┘└────────────────────────────────┘
```

---

## 3. Functional Requirements (Formal EARS Syntax)

### FR-WT-001: Ephemeral Worktree Provisioning (Event-Driven)
* **EARS**: `CUANDO se solicite eos swarm spawn <taskId>, EL SISTEMA creará un directorio de trabajo aislado en .eos/worktrees/<taskId> montado sobre una rama dedicada eos/swarm/<taskId>.`

### FR-WT-002: Worktree State Isolation (Permanent / Ubiquitous)
* **EARS**: `EL SISTEMA WorktreeSwarmOrchestrator garantizará que las operaciones de edición y compilación en un worktree no alteren el índice de git del espacio de trabajo principal.`

### FR-WT-003: Isolated Command Execution (Event-Driven)
* **EARS**: `CUANDO se invoque executeInWorktree(taskId, command), EL SISTEMA ejecutará el comando con el directorio de trabajo (CWD) fijado al worktree correspondiente, capturando stdout, stderr y código de salida de forma determinista.`

### FR-WT-004: Byzantine Arbitration Gated Reconciliation (Event-Driven)
* **EARS**: `CUANDO se solicite la reconciliación de un worktree, EL SISTEMA ejecutará la suite de verificación y someterá los cambios al MultiAgentArbitrationEngine; SI se detecta un veto o falla de tests, ENTONCES EL SISTEMA abortará la fusión y notificará la causa raíz.`

### FR-WT-005: Idempotent Worktree Pruning (Event-Driven)
* **EARS**: `CUANDO se invoque pruneWorktree(taskId), EL SISTEMA desmontará el worktree de git, eliminará el directorio de trabajo y limpiará la rama efímera sin dejar archivos huérfanos.`

---

## 4. Acceptance Criteria (BDD)

```gherkin
ESCENARIO: Creación exitosa de un worktree aislado
  DADO un repositorio git en estado válido
  CUANDO se ejecuta spawnWorktree("task-101")
  ENTONCES se crea el directorio .eos/worktrees/task-101
  Y la rama activa dentro del worktree es eos/swarm/task-101
  Y el worktree aparece registrado en listWorktrees()

ESCENARIO: Ejecución de comando en entorno aislado
  DADO un worktree aprovisionado para "task-101"
  CUANDO se ejecuta executeInWorktree("task-101", "git branch --show-current")
  ENTONCES la salida estándar devuelve "eos/swarm/task-101"
  Y el exit code es 0

ESCENARIO: Reconciliación rechazada por veto de seguridad
  DADO un worktree donde se introdujo un cambio con credenciales en texto plano
  CUANDO se ejecuta reconcileWorktree("task-101")
  ENTONCES el MultiAgentArbitrationEngine emite un VETO_REJECTED
  Y la rama principal main no sufre modificaciones
  Y el estado del worktree pasa a RECONCILIATION_FAILED

ESCENARIO: Poda y limpieza de worktree
  DADO un worktree existente
  CUANDO se llama a pruneWorktree("task-101")
  ENTONCES el directorio en el disco es removido
  Y el worktree ya no figura en git worktree list
```
