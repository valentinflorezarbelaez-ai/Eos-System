# Tasks — eos-specboot-antigravity-first

## Step 0: Branch

- [x] Use `cursor/eos-specboot-antigravity-first` from main@d86ab23 (post S4 #78); tip already has SPECBOOT_CYCLE pointer commit

## Step 1: OpenSpec FIRST

- [x] `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, delta spec

## Step 2: RED — TDD suite

- [x] `tests/eos-specboot-antigravity-first.test.js`
- [x] `package.json` `test:specboot-agy`

## Step 3: GREEN — docs + skills + lock + wire

- [x] Refresh `SPECBOOT_CYCLE.md` (AGY skills map + ANTIGRAVITY_FIRST link)
- [x] `docs/harness/ANTIGRAVITY_FIRST.md`
- [x] Thin `.agents/skills/{ff,propose,apply,verify,archive,commit}/SKILL.md`
- [x] Pointers AGENTS.md / CLAUDE.md / CONTEXT / openspec config.yaml
- [x] `scripts/lib/specboot-cycle-lock.js` + verify-eos 3g13
- [x] DEFER stubs under `docs/` (**leave unstaged**)

## Step 4: Evidence + freeze

- [x] Spanish evidence `docs/releases/EOS_SPECBOOT_ANTIGRAVITY_FIRST_2026-09-09.md`
- [x] Freeze note (do **not** move main_tip)

## Step 5: Verify + push

- [x] `npm run test:specboot-agy` PASS (13/13)
- [x] `npm run verify:strict` PASS (757 checks / 0 failures; specboot-cycle-lock VERIFIED)
- [ ] Commit + push; **no PR**
- [ ] Report SHA + remaining install gaps (openspec CLI, daemon)
