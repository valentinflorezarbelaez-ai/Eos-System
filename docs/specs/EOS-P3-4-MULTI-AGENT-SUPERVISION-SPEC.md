# EOS P3.4 Technical Specification: Multi-Agent Supervision & Correction Loop

**Document ID:** SPEC-P3-4-001  
**Status:** CANONICAL_IMPLEMENTATION_SPEC  
**Date:** 2026-08-20  
**Authority:** Human Director & EOS Senior Systems Architect  

---

## 1. Overview & Lifecycle

Milestone P3.4 establishes the **Multi-Agent Supervision Engine (`src/core/supervision/multi-agent-supervision-engine.js`)**, governing the evaluation, independent review, structured correction, and anti-infinite-loop invariants of task executions:

```text
    TASK_ASSIGNED (Selection Record: Author + Independent Reviewer)
          │
          ▼
    AGENT_WORKING (Cursor Execution in bounded worktree)
          │
          ▼
    RESULT_SUBMITTED (Cursor Return Package)
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│             MultiAgentSupervisionEngine                     │
│   1. Anti-Infinite-Loop Check (diff & test pass parity)     │
│   2. 8-Dimensional Quality Scoring (0 - 100)                │
│   3. Independent Reviewer Verification (Author != Reviewer) │
│   4. Verdict & Correction Directive Generation              │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
    [Pass Rate = 100% & Dims >= 80]     [Defects / Test Failures]
               │                               │
               ▼                               ▼
       verdict: ACCEPTED              Retry Count < Max?
                                       ├─ YES ──► verdict: REQUEST_CORRECTION
                                       └─ NO  ──► verdict: ESCALATE_HITL
```

---

## 2. 8-Dimensional Evaluation Matrix

| Quality Dimension | Weight | Evaluation Criteria |
|---|---|---|
| **Contract Fidelity** | 20% | All `required_outputs` present; scope respected. |
| **Technical Correctness** | 30% | `test_results.pass_rate * 100` (must be 100% for `ACCEPTED`). |
| **Evidence Quality** | 15% | SHA-256 evidence receipt hashes present and verified. |
| **Security & Boundaries** | 15% | Zero protected surfaces touched; zero secret leaks. |
| **Cost & Token Efficiency** | 5% | Budget limits respected without runaway tokens. |
| **Reproducibility** | 5% | Deterministic tests passing without flake. |
| **Handoff Quality** | 5% | Unified diff and affected files structured cleanly. |
| **Communication Clarity** | 5% | Explicit summary, risks, and unknowns documented. |

---

## 3. Anti-Infinite-Loop Invariant

- **Rule**: If an agent submits a retry return package with **the exact same diff hash and test pass rate** as the previous attempt without modifications, the engine **immediately aborts retries and transitions to `ESCALATE_HITL`** with `action_required: STOP_IMMEDIATE_ESCALATION`.

---

## 4. Epistemic Claim Permitted

> **EOS can supervise and evaluate delegated tasks across 8 quality dimensions, issue structured correction directives, and escalate unresolvable defects to Human-in-the-Loop governance based on cryptographic evidence.**
