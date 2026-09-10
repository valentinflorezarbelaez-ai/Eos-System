# EOS Loop Engineering — 4Q Guides/Sensors Matrix

**SSOT path:** `docs/harness/LOOP_ENGINEERING_4Q.md`  
**ADR:** [`docs/architecture/adrs/ADR-0017-loop-engineering-4q.md`](../architecture/adrs/ADR-0017-loop-engineering-4q.md)  
**Related:** [`ADR-0014` mission-loop MCP](../architecture/adrs/ADR-0014-mission-loop-mcp-enforcement.md) (stage FSM overlay — **not** rewritten here)  
**Ladder:** 7 / **Step:** S3 (K3)  
**Date:** 2026-09-09  
**PRODUCTION_READY:** NO  
**Fundacion:** Delta=0 (untouched)  
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (unchanged)

> **NON-CLAIM:** Loop Engineering **policy ≠ productive autonomy**.  
> Loop Engineering matrix **≠ verify:strict** (policy map / taxonomy — not a substitute for `npm run verify:strict`).  
> doctor ≠ verify (doctor remains OBSERVED honesty / presence-light only).  
> This document does **not** claim an autonomous remediation OS, “whiplash solved”, or that policy alone executes the cycle.  
> policy != productive autonomy; Loop != verify:strict.

**LIDR adoption pointer:** [`docs/releases/EOS_LIDR_HARNESS_WORKSHOP_ADOPTION_2026-09-09.md`](../releases/EOS_LIDR_HARNESS_WORKSHOP_ADOPTION_2026-09-09.md)  
**Audit DoD:** [`docs/releases/EOS_MATURITY_LADDER_7_AUDIT_2026-09-09.md`](../releases/EOS_MATURITY_LADDER_7_AUDIT_2026-09-09.md) (S3 row)  
**Context Pack TPC (S2):** [`docs/harness/CONTEXT_PACK_TPC.md`](./CONTEXT_PACK_TPC.md)

---

## 0. Purpose

Publish one canonical **Loop Engineering** SSOT so operators and agents can see:

1. The LIDR cycle **guides → act → sensors → feedback** as it applies to EOS.
2. The **four-quadrant** matrix (feedforward/feedback × computational/inferential) mapped to **existing** EOS surfaces.
3. Honesty boundaries: mission loop MCP (ADR-0014) remains the stage overlay; this matrix is policy taxonomy, not a new runtime FSM.

Do **not** rewrite ADR-0011 (harness/token hygiene) or ADR-0014 (mission-loop MCP).

---

## 1. Cycle

Ordered loop (conceptual policy — not a claim of autonomous execution):

| Stage | Role | EOS reading |
| --- | --- | --- |
| **guides** | Shape intent and constrain before mutation | Rules, AGENTS/CLAUDE, OpenSpec/plan, Write Barrier allowlist, hooks pre, doctor OBSERVED honesty |
| **act** | Bounded execution | Mission-loop Act stage (ADR-0014) + Write Barrier sandbox writes |
| **sensors** | Detect outcomes / drift / contract breaks | verify:strict, CI seam-pack, TDD, hooks post, locks, fusion-light, adversarial-review, HITL |
| **feedback** | Close the loop into governance | Fail-closed locks, review rituals, human decisions — **not** silent self-heal autonomy claims |

Cycle mnemonic: **guides→act→sensors→feedback**.

---

## 2. Four-quadrant matrix

Axes (Böckeler / LIDR harness taxonomy):

- **Feedforward** = before/during act (guides that prevent bad moves)
- **Feedback** = after sensors fire (signals that correct or gate)
- **Computational** = mechanical / deterministic checks and artifacts
- **Inferential** = judgment / honesty / human or adversarial interpretation

### Feedforward × Computational

Pre-act mechanical guides:

| Surface | Role |
| --- | --- |
| `AGENTS.md` / `CLAUDE.md` / `.agents/AGENTS.md` | Thin + canonical agent operating protocol |
| `.cursor/rules/*` | Doctrine rules (harness, context, EOS 00–09) |
| hooks **pre** (`scripts/install-git-hooks.js`, pre-commit/pre-push) | Gate before mutation leaves the workstation |
| linters / static checks | Local mechanical hygiene before Act |
| Write Barrier allowlist (`docs/security/WRITE_BARRIER_SANDBOX.md`, `config/security/write-barrier-ssot-roots.json`, `src/core/write-barrier/`) | Fail-closed writable roots |

### Feedforward × Inferential

Pre-act judgment / honesty guides:

| Surface | Role |
| --- | --- |
| plan mode / OpenSpec propose (`openspec/`, `docs/openspec-tasks-mandatory-steps.md`) | Spec-first intent before Act |
| `eos:doctor` / `bin/eos-doctor.js` **OBSERVED** honesty | Presence/light OBSERVED — **not** verify:strict |

### Feedback × Computational

Post-act mechanical sensors + locks:

| Surface | Role |
| --- | --- |
| `npm run verify:strict` / `scripts/verify-eos.js` | Primary computational feedback gate |
| CI seam-pack (GHA + `scripts/ci/assert-gha-contract.js`) | Remote computational feedback |
| TDD (`node --test`, `test:s*` / ladder suites) | Spec-driven feedback on contracts |
| hooks **post** | Post-mutation mechanical sensors |
| complexity / context-pack / sibling locks (`scripts/lib/complexity-budget-lock.js`, `context-pack-lock.js`, `loop-engineering-lock.js`, …) | Fail-closed presence of governance SSOT |

### Feedback × Inferential

Post-act judgment sensors:

| Surface | Role |
| --- | --- |
| adversarial-review (tests / rituals) | Hostile reading of claims and bypass paths |
| fusion-light (`scripts/lib/independent-fusion-light.js`) | Independent light OBSERVED fusion — not full verify |
| human **HITL** | Operator/PO decisions (merge, prune, billing, PRODUCTION_READY) |

---

## 3. Mapping notes (honesty)

1. **ADR-0014** owns Intent→Spec→Plan→Act→Evidence→Verify→Archive as MCP stage enforcement. This 4Q matrix **classifies guides/sensors**; it does not replace the mission-loop FSM.
2. **doctor ≠ verify:strict** — doctor is feedforward-inferential honesty (OBSERVED). verify:strict is feedback-computational.
3. **Loop Engineering policy ≠ productive autonomy** — publishing the matrix does not authorize unsupervised remediations or claim the loop “runs itself”.
4. **PRODUCTION_READY=NO**; Fundacion Delta=0; no new `docs/schemas/**/*.json` while AT_CEILING.

---

## 4. Verify lock

`scripts/lib/loop-engineering-lock.js` → `auditLoopEngineeringLock` is wired into `verify:strict` (block **3g11**). Fail-closed if this SSOT or required needles/paths are missing.

---

## 5. Related harness (S4)

Worktree isolation policy (one agent/session ≠ shared dirty dir; Spec-Boot map; CI-safe smoke): [`docs/harness/WORKTREE_ISOLATION_POLICY.md`](./WORKTREE_ISOLATION_POLICY.md).
