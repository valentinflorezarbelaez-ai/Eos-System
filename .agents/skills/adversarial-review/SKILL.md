---
name: adversarial-review
description: Independent adversarial red-team review pass to refute assumptions and find edge cases before archiving an OpenSpec change.
---

# adversarial-review Skill

Act as an **independent adversarial reviewer**: assume gaps, flaws, or unsafe behavior may exist until you have argued against them with evidence.

This skill is intended for the **verification window** of spec-driven development (after implementation, **before** archiving), when an independent review pass is executed (BUILDER ≠ VERIFIER).

> [!NOTE]
> Per EOS ADR-0010 and ADR-0019, independent adversarial review produces an **INFORMATIONAL** outcome under Receipt-Driven Development (RDD). It does NOT automatically authorize delivery or merge to main without HITL / PO approval.

## Depth and lenses (RDD)

Freeze the candidate before reading it: review a committed revision plus its `git diff`, never a live worktree that can shift mid-review. Depth comes from the frozen candidate, not from how large the diff feels.

| Depth | Trigger | Lenses |
| --- | --- | --- |
| Passive | Docs, comments, formatting | Structural readback; zero lenses |
| Medium | Local behaviour change inside one bounded area | One lens, chosen by the dominant risk |
| High | New contract, governance surface, security path, external write | All four: **Risk, Resilience, Readability, Reliability** |

Allow at most **one bounded correction** per review transaction. A second round means the change was not ready: return it to the implementation loop instead of iterating inside the review.

## Inputs
- Scope: Explicit ticket ID, feature name, PR, or active OpenSpec change directory.
- Ground truth: Proposal, specs, design, and `tasks.md`.

## Mindset (Red-Team Refutation)
- **Try to break the system**, not merely confirm happy paths.
- **Hunt incorrect assumptions** about data shape, timing, ordering, authz, idempotency, and error recovery.
- **Trace cross-boundary risks**: multi-file dependencies, state races, unhandled promise rejections.
- **Calibrate depth to risk**: auth, billing, privilege boundaries, and database mutations deserve strictest scrutiny.

## Workflow

### Step 1 — Load the Specification First
1. Identify the OpenSpec change directory and inspect `spec.md`, `design.md`, and `tasks.md`.
2. Extract acceptance criteria (Given-When-Then) and explicit non-goals.
3. Flag underspecified requirements (missing error codes, loose regex, vague performance bounds).

### Step 2 — Load Implementation Evidence
1. Review git diff or pull request.
2. Map code changes to specific spec sections and tasks.
3. Check test coverage: do tests actually prove business criteria or only trivial paths?

### Step 3 — Adversarial Refutation Pass
For each scenario:
1. Identify how the code could fail under stress (empty arrays, oversized payload, concurrent requests, unauthenticated context).
2. Check abuse cases (SQLi, IDOR, prototype pollution, path traversal).
3. Record any **spec vs code drift** as a first-class finding.

### Step 4 — Severity Classification
- **Blocker**: Security flaw, data loss risk, or spec violation that halts archiving.
- **Major**: Significant logic gap or missing edge-case handling.
- **Minor**: Code clarity, non-critical tech debt.
- **Assumption / Question**: Requires human product owner clarification.

### Step 5 — Verdict
End with an explicit verdict:
- **PASS (Adversarial)**: Zero blockers or majors.
- **PASS WITH GAPS**: Minor findings tracked for future iterations.
- **FAIL**: At least one blocker or major issue identified.
