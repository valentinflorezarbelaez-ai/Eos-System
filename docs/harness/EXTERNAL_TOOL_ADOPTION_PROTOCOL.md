# External Tool Adoption Protocol

**Status:** HARNESS PROCEDURE (procedural gateway, not policy)
**Date:** 2026-10-20
**Applies to:** any external capability that EOS or an EOS-directed agent would operate — binaries, CLIs, browser drivers, hosted models, SaaS APIs
**Related:** `AGENTS.md` §5 (write barrier), `docs/policies/EOS-SUPERVISED-AUTONOMY-POLICY.md`, `DEPENDENCY_POLICY_L0.md`, `docs/policies/EOS-CONTEXT-AND-TOKEN-EFFICIENCY-POLICY.md`
**Instances:** ego lite → `CMP-0002` + `SRC-0081`; Jev → `RSC-0021` + `SRC-0075`

> **NON-CLAIM:** This procedure grants no authorization. It defines the evidence a human Product Owner needs in order to decide. It does not install, execute, or approve anything, and it does not override `CONSTITUTION.md`, the write barrier, or L0 purity.

---

## 1. Why this exists

EOS already has a write barrier for **where** it may write. It lacked a single procedure for **what** it may operate, and the gap matters because the two riskiest external capabilities evaluated so far — an agent browser that reuses real logged-in sessions, and a hosted decision model — both fail naive review in the same way: they look like a productivity win and are actually a credential and data-flow surface.

The recurring failure mode is not "bad tool". It is **adopting the demo instead of the failure mode**.

---

## 2. Trigger conditions

Run this protocol whenever a candidate capability satisfies **any** of:

1. It executes as a process outside the repo (binary, CLI, daemon, browser).
2. It requires network egress at runtime.
3. It touches credentials, cookies, session tokens, or authenticated state.
4. It can perform actions with external side effects (send, post, purchase, deploy, delete).
5. It becomes a root `dependency` or `devDependency`.
6. It makes a performance claim that would change an architectural decision.

If none apply (a pure documentation or reference source), record it as a `SRC-*` and stop here.

---

## 3. Blast-radius classification

| Class | Definition | Minimum authorization |
| --- | --- | --- |
| **R0** | Read-only, local, no credentials, no side effects | Autonomous within `LOCAL_BOUNDED_AUTONOMY` |
| **R1** | Local writes inside `allowed_edit_roots`, reversible | Autonomous, evidence recorded |
| **R2** | Network read, no credentials, no side effects | Autonomous with budget; egress logged |
| **R3** | Operates with the operator's real identity or tokens; read-only external actions | **PO approval per evaluation phase**, dedicated identity, allowlisted targets |
| **R4** | Operates with real identity and can mutate external state (send, purchase, publish, destroy) | **PO approval per individual action.** Never blanket autonomy. Kill switch mandatory |

Anything classified **R3 or R4** may not be installed, connected or executed as part of routine autonomous work.

---

## 4. Mandatory preconditions (Gate P0)

All must exist before any execution:

- [ ] `SRC-*` record with `known_bias`, `independence` and `verification_status` set honestly
- [ ] Comparative record (`CMP-*`) against the **incumbent** solution, not against nothing
- [ ] Written statement of the mechanism being adopted vs the product being bought
- [ ] Named human owner and an explicit expiry date for the evaluation window
- [ ] Target machine named, and confirmed **non-corporate** if R3/R4 (no SSO, no shared secrets)
- [ ] Rollback: how to remove it completely, verified as executable
- [ ] Kill switch identified (process, profile, network cutoff) and tested once
- [ ] Data-flow statement: what leaves the machine, to whom, under which key

**If any box is empty, the answer is DEFER.** A DEFER is a legitimate, recorded outcome, not a failure to deliver.

---

## 5. Phased ladder

Each phase has an exit gate. **A later phase may not start because an earlier one "felt fine"** — it starts when the gate's evidence exists.

| Phase | Action | Exit gate | Abort on |
| --- | --- | --- | --- |
| **P0 Static** | Read source, licence, release notes, open-issue backlog, supply chain | Diff between marketing claim and primary source documented | Licence misrepresented; no rollback path |
| **P1 Isolated read** | Fresh profile/account, no personal logins, 3 read-only tasks | 3/3 task success, no unexpected network destinations | Any prompt-injection-induced action |
| **P2 Isolated identity write** | Throwaway identity + sandbox target, 1 bounded write | Write succeeded, undo verified, audit trail complete | Undo fails; action not in audit trail |
| **P3 Authenticated read** | Real identity, read only, allowlisted domains | 5/5 task success; zero writes; egress matches statement | Any write; any domain outside the allowlist |
| **P4 Mutating action** | Real identity, one action at a time, PO approves each | 100% of actions pre-approved; zero unapproved | One unapproved action ends the evaluation permanently |

---

## 6. Threat model checklist

Required per candidate, with a mitigation or an explicitly accepted risk:

| Threat | Question |
| --- | --- |
| Supply chain | Is the distributed artifact the one the source builds? Is the repo licence the artifact licence? |
| Untrusted input | Page content, model output and tool output are all attacker-controlled. Can any of them cause an action? |
| Prompt injection to action | Does a malicious page reach the action layer without a human gate? |
| Credential exposure | Which cookies/tokens can the tool read? What is the worst action reachable with them? |
| Lateral reach | Does it operate "across the whole machine" or only inside a scoped sandbox? |
| Data flow outward | What reaches a third party, under whose key, and is that acceptable for the data involved? |
| Silent autonomy | Can it act while the operator is not watching? If yes, that is the finding. |
| Reversibility | Is every action undoable, and is the undo verified rather than assumed? |
| Benchmark provenance | Who designed, ran and graded the benchmark? |
| Abandonment risk | Open issues, release cadence, single maintainer, licence-change history |

---

## 7. Metrics to record

Numbers, not adjectives. Every phase reports:

- Task success rate against a rubric fixed **before** the run
- p50 and p95 latency per task
- Tokens per task (or cost per task) against the incumbent
- Context cost per observation (e.g. snapshot size in tokens)
- Unapproved actions (must be 0)
- Rollback executions and their outcome
- Divergence between the vendor claim and the measured result, stated explicitly

---

## 8. Decision output

Every evaluation closes with exactly one of: `ADOPT`, `PILOT`, `OBSERVE`, `REJECT`, `DEFER` — recorded as a `DEC-INT-*` if it changes architecture, and referenced from the originating `RSC-*`/`CMP-*`. The decision names the evidence identifier and states what would have to be true to revisit it.

---

## 9. Instance: ego lite (agent browser)

| Field | Value |
| --- | --- |
| Class | **R4** — reuses the operator's real Chrome sessions and can act across the machine |
| Mechanism worth stealing | Compact page snapshot (~200-400 tokens/page) vs raw HTML → directly feeds Token & Context Hygiene Protocol §8 |
| Product | Proprietary binary, free download, macOS/Windows only (no Linux), repo MIT but the browser is not |
| Evidence | `CMP-0002`, `SRC-0081`, `EVD-0074` |
| Blocking items | L0 purity (external binary); not MCP (CLI skill, needs a new adapter); vendor-authored benchmark; no Linux in this environment |
| Status | **DEFER** at P0. P1 is not authorized. |

## 10. Instance: Jev / System One decision models

| Field | Value |
| --- | --- |
| Class | **R2** — network read, no credentials, no side effects (classified R3 if it ever received operator state containing identifiers) |
| Mechanism worth stealing | Typed decision + calibrated confidence outside the token stream → `PAT-0005`, `ANT-0004` |
| Product | Proprietary hosted model, early access |
| Evidence | `RSC-0021`, `SRC-0075`..`SRC-0077` |
| Blocking items | L0 purity (hosted dependency); all multipliers vendor-reported; no local calibration measurement |
| Status | **OBSERVE**. A pilot would require an existing adapter seam plus our own p95/cost/calibration numbers. |

---

## 11. Non-claims

- This document is not a policy and carries no `LEVEL_0` authority.
- It does not modify `docs/tools/REGISTRY.json`, the MCP catalog, or any skill.
- Passing every phase does **not** authorize adoption; it produces the evidence for a human decision.
