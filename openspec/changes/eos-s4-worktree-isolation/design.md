# Design — eos-s4-worktree-isolation

## Approach (TDD)

1. OpenSpec FIRST (proposal/design/tasks/spec).
2. RED: `tests/eos-s4-worktree-isolation.test.js` asserts policy path, lock module, verify wiring, Spec-Boot skill map needles, NON-CLAIM no swarm, CI-safe smoke (no real worktree create), `test:s4`.
3. GREEN: implement `docs/harness/WORKTREE_ISOLATION_POLICY.md` + `scripts/lib/worktree-policy-lock.js` + verify-eos wire + minimal CONTEXT_PACK/LOOP pointers + `test:s4` + optional CI seam-pack.
4. Evidence (ES) + freeze note.
5. Run `test:s4` + `verify:strict`; commit/push; **no PR**.

## SSOT path decision

**Chosen:** `docs/harness/WORKTREE_ISOLATION_POLICY.md`

Rationale:
- Harness policy belongs beside `CONTEXT_PACK_TPC.md` (S2) and `LOOP_ENGINEERING_4Q.md` (S3) under `docs/harness/`.
- Existing `bin/eos-worktree.js` remains the L0 CLI; this change does **not** reimplement lifecycle.
- Spec-Boot skills stay at `.agents/skills/using-git-worktrees/SKILL.md` and `ai-specs/skills/using-git-worktrees/SKILL.md` — **map/cite only**, no fork.

## Isolation rules (policy body)

1. **One agent/session ≠ shared dirty dir** — do not share an unclean working tree across concurrent agent sessions; prefer isolated worktree / native harness isolation.
2. **Detect existing isolation first** — Spec-Boot Step 0 (GIT_DIR vs GIT_COMMON + submodule guard); never nest worktrees blindly.
3. **EOS base dir** — prefer `.eos-worktrees/` via `bin/eos-worktree.js` when using EOS CLI; Spec-Boot fallback cites `.worktrees/` — both must be gitignored; do not invent a third default without PO.
4. **Limits (do not blindly share across worktrees):**
   - `.env` / secrets — never copy secrets into worktrees by default
   - `node_modules` — install per worktree or document shared-read risk; do not assume shared mutable installs
   - DB / local data dirs — do not point two concurrent sessions at the same mutable DB without explicit PO
   - ports — avoid two sessions binding the same listen port
5. **CI safety:** named smoke (`test:s4`) MUST NOT run `git worktree add/remove` in CI. Allowed: policy needles, lock audit, CLI `--help`, invalid taskId unit checks, path existence for policy + skills + CLI.
6. **NON-CLAIM no swarm:** policy ≠ swarm orchestration; S4 does not promote `EOS-WORKTREE-SWARM-SPEC` / `WorktreeSwarmOrchestrator` to PRODUCTION_READY; historical swarm specs remain non-claims for this ladder step.

## Lock design (mirror loop-engineering-lock)

- Module: `scripts/lib/worktree-policy-lock.js`
- Export: `WORKTREE_POLICY_INDEX`, `WORKTREE_POLICY_REQUIRED_SECTIONS`, `WORKTREE_POLICY_REQUIRED_PATHS`, `auditWorktreePolicyLock(rootDir, options)`
- Fail-closed: missing index OR missing required section needles OR missing PRODUCTION_READY=NO / NON-CLAIM no-swarm language OR missing required companion paths
- Wire: import + append REQUIRED_PATHS + strict block **3g12** after loop-engineering **3g11**
- Fixture overrides: `docText`, `docMissing`, `skipPathChecks`

## Required paths (lock + smoke)

- `docs/harness/WORKTREE_ISOLATION_POLICY.md`
- `scripts/lib/worktree-policy-lock.js`
- `tests/eos-s4-worktree-isolation.test.js`
- `bin/eos-worktree.js`
- `.agents/skills/using-git-worktrees/SKILL.md`
- `ai-specs/skills/using-git-worktrees/SKILL.md`
- `docs/releases/EOS_S4_WORKTREE_ISOLATION_2026-09-09.md`
- `openspec/changes/eos-s4-worktree-isolation/proposal.md`

## CI seam-pack (optional, chosen YES)

`test:s4` is policy/CLI/path-only → fast and CI-safe. Extend seam-pack + `assert-gha-contract` + `CI_CD_CONTRACT.md` like R2/R6.

## Constraints

- Fundacion Δ=0; PRODUCTION_READY=NO
- NON-CLAIM: no swarm; policy ≠ swarm; CI smoke ≠ real worktree churn
- No new docs/schemas JSON (AT_CEILING)
- App Fuerza untouched
- No PR

## Verification

- `npm run test:s4`
- `npm run verify:strict`
- `npm run ci:contract` (after seam-pack update)
