# EOS Worktree Isolation Policy

**SSOT path:** `docs/harness/WORKTREE_ISOLATION_POLICY.md`  
**Ladder:** 7 / **Step:** S4 (K4)  
**Date:** 2026-09-09  
**PRODUCTION_READY:** NO  
**Fundacion:** Delta=0 (untouched)  
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (unchanged)

> **NON-CLAIM:** Worktree isolation **policy ≠ swarm** orchestration.  
> S4 does **not** claim multi-agent worktree swarm is PRODUCTION_READY (**no swarm** claim).  
> CI-safe smoke ≠ real `git worktree add/remove` churn.  
> Spec-Boot skill is **mapped/cited** — **no fork** of the skill body into a duplicate EOS skill.  
> policy != swarm; this document does not authorize unsupervised parallel agent swarms on shared dirty trees.

**LIDR / Spec-Boot pointer:** skill `using-git-worktrees` (cite only)  
**CLI:** [`bin/eos-worktree.js`](../../bin/eos-worktree.js)  
**Audit DoD:** [`docs/releases/EOS_MATURITY_LADDER_7_AUDIT_2026-09-09.md`](../releases/EOS_MATURITY_LADDER_7_AUDIT_2026-09-09.md) (S4 row)  
**Related harness:** [`CONTEXT_PACK_TPC.md`](./CONTEXT_PACK_TPC.md) (S2) · [`LOOP_ENGINEERING_4Q.md`](./LOOP_ENGINEERING_4Q.md) (S3)

---

## 0. Purpose

Publish one canonical **worktree isolation** policy so operators and agents know:

1. Concurrent agent sessions must not share a dirty working directory.
2. Spec-Boot `using-git-worktrees` is the procedural map (cite existing skill paths; do not fork).
3. Hard limits around secrets, installs, databases, and ports.
4. Named smoke (`test:s4`) stays CI-safe — policy/CLI/path lock only.

Existing L0 CLI `bin/eos-worktree.js` and historical swarm specs remain as-is; this policy does **not** reimplement lifecycle or promote swarm.

---

## 1. Isolation rule

**one agent/session ≠ shared dirty directory.**

- Do not run two agent sessions against the same unclean working tree.
- Prefer isolated workspace: native harness worktree tools first; else EOS CLI / git worktree fallback.
- Detect existing isolation before creating another (Spec-Boot Step 0: `GIT_DIR` vs `GIT_COMMON` + submodule guard).
- EOS CLI default base: `.eos-worktrees/` (via `bin/eos-worktree.js`). Spec-Boot fallback cites `.worktrees/`. Both must remain gitignored. Do not invent a third default without PO.

---

## 2. Spec-Boot map

Map Spec-Boot skill **using-git-worktrees** **without** forking the skill body:

| Role | Path |
| --- | --- |
| Agent skill (primary cite) | `.agents/skills/using-git-worktrees/SKILL.md` |
| AI-specs mirror cite | `ai-specs/skills/using-git-worktrees/SKILL.md` |
| EOS L0 CLI | `bin/eos-worktree.js` |
| EOS worktree base | `.eos-worktrees/` |

**no fork:** do not copy Spec-Boot steps into a new competing skill tree. Cite and follow the existing skill; this policy only states EOS governance constraints (isolation, limits, CI-safe smoke, NON-CLAIM).

Announce when using the skill: follow Spec-Boot Step 0 → native tools → git fallback order.

---

## 3. Limits

Do **not** blindly share across concurrent worktrees / sessions:

| Limit | Rule |
| --- | --- |
| **.env** / secrets | Never copy secrets into worktrees by default; do not commit `.env`. |
| **node_modules** | Prefer per-worktree install; do not assume a shared mutable `node_modules` is safe across sessions. |
| **DB** / local data | Do not point two concurrent sessions at the same mutable database/data dir without explicit PO. |
| **ports** | Avoid two sessions binding the same listen port; document overrides when intentional. |

---

## 4. CI-safe smoke

Named pack `npm run test:s4` → `tests/eos-s4-worktree-isolation.test.js` is **CI-safe**:

- **Allowed:** OpenSpec presence; `auditWorktreePolicyLock`; policy needles; skill/CLI path existence; `bin/eos-worktree.js --help`; invalid `taskId` unit rejects.
- **Forbidden in named smoke:** `git worktree add`, `git worktree remove`, real create/cleanup lifecycle churn.

Bounded local create/cleanup may exist in other suites (`tests/eos-worktree.test.js`) for local developer use — **not** required for S4 seam-pack. S4 documents this NON-CLAIM: governance smoke stays at policy/CLI level.

Verify lock: `scripts/lib/worktree-policy-lock.js` → `auditWorktreePolicyLock` (strict block **3g12**).

---

## 5. Non-claims

- **NON-CLAIM:** **no swarm** — policy ≠ swarm orchestration; does not promote `EOS-WORKTREE-SWARM-SPEC` / `WorktreeSwarmOrchestrator` to PRODUCTION_READY.
- **NON-CLAIM:** CI-safe smoke ≠ proof of full worktree lifecycle in CI.
- **NON-CLAIM:** Spec-Boot map ≠ wholesale Spec-Boot install / skill fork.
- **PRODUCTION_READY:** NO
- Fundacion Delta=0; App Fuerza untouched
- No new `docs/schemas/**/*.json` (AT_CEILING)
- Does not implement S5–S6 (KEEP inventory / model routing ratchet)

---

## 6. Verify lock

- Module: `scripts/lib/worktree-policy-lock.js` → `auditWorktreePolicyLock`
- Wired into `scripts/verify-eos.js` under `--strict` (block **3g12**)
- Tests: `npm run test:s4`
- Evidence: `docs/releases/EOS_S4_WORKTREE_ISOLATION_2026-09-09.md`

Fail-closed if this policy is missing or required section needles / companion paths disappear.