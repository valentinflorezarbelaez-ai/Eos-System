# Harness & Loop Engineering Architectural Blueprint

## Executive Summary
This document establishes the official architectural doctrine for **Harness Engineering** and **Loop Engineering** within the **Engineering Operating System (EOS v0.6.0+)**. It synthesizes empirical research from **LIDR Academy**, **Gentleman Programming (Gentle-AI)**, **Boris Cherny (Claude Code / Anthropic)**, and industry benchmarks from **Vercel**, **LangChain**, and **Stripe**.

---

## 1. The Autonomous Agent Hierarchy

Modern AI engineering operates across a strict 3-tier pyramid. Failure to respect the foundational layers guarantees failure in the higher layers.

```text
               ▲
              / \
             /   \
            /     \
           / LOOP  \          Tier 3: Autonomous Triggers, Self-Correction,
          / ENGINE- \                 Orchestrators & Closed-Loop Feedback
         /  ERING    \
        /─────────────\
       /   HARNESS     \      Tier 2: Filesystem, Sandboxing, Memory (Engram),
      /  ENGINEERING    \             Tool Pruning, Worktrees, Guides & Sensors
     /───────────────────\
    /       CONTEXT       \   Tier 1: Data Models, Tech Specs, Conventions,
   /      ENGINEERING      \          Living Specs (OpenSpec/Spec-Kit), EARS/BDD
  /─────────────────────────\
```

1. **Context Engineering (Tier 1 - Base):** The structured information presented to the agent. Not merely prompts, but architectural schemas, entity relationships, coding conventions, and deterministic specifications.
2. **Harness Engineering (Tier 2 - Mid):** The execution environment, tools, persistent memory, worktree isolation, and verification sensors.
3. **Loop Engineering (Tier 3 - Top):** The autonomous orchestrator that triggers agents, analyzes sensor outputs, executes self-healing corrections, and governs deployment gates.

---

## 2. The Hashimoto Equation & Empirical Benchmarks

Mitchell Hashimoto (Founder of HashiCorp) formulated the governing equation of modern agentic systems:

$$\text{Agent} = \text{Model} + \text{Harness}$$

Where:
* **Model $\approx$ CPU:** Raw probabilistic reasoning. Replacing the model rarely solves fundamental workflow failures.
* **Context $\approx$ RAM:** Transient tokens in the active context window. Subject to context rot and dilution.
* **Harness $\approx$ Operating System:** The runtime substrate providing persistence, system calls, sandboxing, memory, and telemetry.

### Empirical Industry Evidence
* **Vercel Text-to-SQL Agent:** By pruning 80% of exposed database inspection tools and placing the agent in a constrained harness with pre-execution schema contracts, query success jumped from 60% to **100%**, latency dropped by **3.5x**, and token usage decreased by **37%**.
* **LangChain Terminal-Bench 2.0:** Moving from #30 to **#5 globally** without altering the underlying model, achieved solely by engineering a deterministic test-driven terminal harness.
* **Stripe Automation:** Over **1,300 pull requests per week** are evaluated, tested, and safely staged without human developer intervention because the harness executes rigid pre-commit verification sensors before notifying reviewers.

---

## 3. The 6 Invariant Primitives of the EOS Harness

| # | Primitive | Technical Responsibility | EOS Implementation |
|---|---|---|---|
| 1 | **Durable Filesystem** | Persistent state storage across steps and process boundaries | Canonical directory layout, `docs/evidence/`, Git history |
| 2 | **Code Execution** | Real system terminal access for native compilation and testing | Native PowerShell / Bash execution via `run_command` |
| 3 | **Sandbox & Isolation** | Host environment protection and branch safety | `EXTERNAL_PROJECT_WRITE_BARRIER` and **Git Worktrees** |
| 4 | **Memory & Search** | Persistent cross-session and cross-compaction memory | **Engram** (Go binary + SQLite + FTS5), `mem_save`, AST index |
| 5 | **Context Management** | Prevention of context rot, cognitive overload, and token bloat | Bounded exploration, file offloading, AST pruning |
| 6 | **Guides & Sensors** | Deterministic pre-flight checks and post-execution verifications | **Guides:** `AGENTS.md`, `.mdc`, linters<br>**Sensors:** `npm run verify:strict`, TDD, RDD Git diffs |

---

## 4. Tool Pruning & Minimal Cognitive Surface Doctrine

> **The First Law of Agent Tooling:** An agent's error rate scales quadratically with the ambiguity and quantity of its available tools.

EOS mandates strict tool pruning by lifecycle phase:

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. EXPLORATION PHASE                                        │
│ Tools: view_file, grep_search, read_url_content, AST query  │
│ Restraints: Read-Only. No modification tools loaded.         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. IMPLEMENTATION PHASE                                     │
│ Tools: replace_file_content, multi_replace_file_content      │
│ Restraints: Bounded file edits. No bulk overwrites.         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. VERIFICATION & SENSOR PHASE                              │
│ Tools: run_command (linters, typechecks, test runners)      │
│ Restraints: Zero LLM self-evaluation. Compilers decide truth.│
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Physical Multi-Agent Isolation via Git Worktrees

To prevent dirty git states, race conditions, and context contamination during multi-agent or background tasks, EOS employs physical filesystem separation using **Git Worktrees**:

```bash
# Provision isolated worktree for atomic task
git worktree add ../eos-worktrees/<task-id> -b task/<task-id>

# Subagent executes strictly within isolated path
cd ../eos-worktrees/<task-id>

# Run verification sensors
npm test && npm run verify:strict

# Merge cleanly and tear down worktree upon exit code 0
git worktree remove ../eos-worktrees/<task-id>
```

---

## 6. Boris Cherny's 9 Operational Disciplines (Claude Code Standard)

1. **Terminal Concurrency:** Parallel execution across segregated worktrees rather than stacking disparate tasks in a single conversation.
2. **Extended Thinking Budgets:** High-reasoning models allocated deliberate thinking time for Architecture (Fase 3) and Security (Fase 7).
3. **Living Governance Files:** Up-to-date `AGENTS.md` and `.cursorrules` serving as immutable pre-execution guides.
4. **Plan-Before-Write Mode:** Exploration and architectural trade-off analysis strictly precede file modification.
5. **Code Simplifier Subagent:** Immediate post-green refactoring to prune premature abstractions and unnecessary wrappers.
6. **Verify-App Hook:** Deterministic pre-commit gate running `npm run verify:strict`.
7. **Post-Tool-Use Syntax Guards:** Immediate validation of patched files to catch syntax defects before task progression.
8. **Pre-Approved Safe Command Domain:** Automated execution of safe, read-only diagnostic commands without human micro-approvals.
9. **Receipt-Driven Evidence:** Cryptographic verification logs (`EVD-XXXX.json`) capturing exit codes and SHA-256 hashes.

---

## 7. Dual-Route Specification Integration: OpenSpec & Spec-Kit

EOS unifies both industry paradigms based on risk:

```text
                    [Inbound Engineering Task]
                                │
                 Is it a high-risk core change,
               Constitutional edit, or Level 2+?
                                │
                 ┌──────────────┴──────────────┐
                 │ YES                         │ NO
                 ▼                             ▼
        [SPEC-KIT ROUTE]               [OPENSPEC ROUTE]
  - Formal Constitution Gates     - Lightweight Delta-Specs
  - Full EARS + BDD Spec Package  - /opsx:* Schema Updates
  - Architecture Review ADRs      - Fast Brownfield Refactoring
  - Level 2+ PO Authorization     - Direct TDD Implementation
```
