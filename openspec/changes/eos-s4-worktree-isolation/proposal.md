# Proposal — EOS S4 Worktree isolation policy + smoke

## Why

Ladder 7 audit **S4 / K4** (post S3 Loop Engineering 4Q @ main `f1c1577`): doctrine and historical specs mention worktrees (`bin/eos-worktree.js`, Spec-Boot skill `using-git-worktrees`, archived P3 canaries, `EOS-WORKTREE-SWARM-SPEC.md`), but there is **no** canonical **worktree isolation policy** in the governance pack with a CI-safe smoke/named test and a verify:strict existence lock. Spec-Boot skill paths exist but are not mapped from an enforceable EOS policy SSOT.

## What (this change only)

1. OpenSpec change folder `openspec/changes/eos-s4-worktree-isolation/` (this proposal + design + tasks + delta spec)
2. Canonical SSOT: `docs/harness/WORKTREE_ISOLATION_POLICY.md`
   - One agent/session ≠ shared dirty directory
   - Map Spec-Boot `using-git-worktrees` (cite paths; **no fork** of skill body)
   - Limits: `.env` / `node_modules` / DB / ports
   - NON-CLAIM: no swarm claim; policy ≠ swarm orchestration; CI smoke ≠ real worktree churn
3. Minimal pointers from `CONTEXT_PACK_TPC.md` / `LOOP_ENGINEERING_4Q.md` if natural
4. `scripts/lib/worktree-policy-lock.js` + wire into `verify:strict` (existence + required needles + skill/CLI paths)
5. TDD `tests/eos-s4-worktree-isolation.test.js` + `package.json` `test:s4` — **CI-safe** (policy/CLI help/dry-run + path lock; **no** `git worktree add/remove` in the named smoke)
6. Optional: add `test:s4` to CI seam-pack + contract (fast/safe only)
7. Spanish evidence `docs/releases/EOS_S4_WORKTREE_ISOLATION_2026-09-09.md` + freeze note

## Routing

**SDD** (ADR-0010 / docs/base-standards.md). Human requested **ZERO vibe coding** — 100% Spec-Driven Development + Strict TDD.

## NON-goals

- PRODUCTION_READY flip
- Claiming swarm / multi-agent worktree OS ready
- Dangerous git worktree churn in CI
- Forking Spec-Boot skill into a duplicate body
- New `docs/schemas/**/*.json` (AT_CEILING 35/35)
- Fundacion / App Fuerza
- Open/merge PR
- Tip refresh (freeze tip stays; S1 already closed tip refresh)
- S5–S6 implementation
