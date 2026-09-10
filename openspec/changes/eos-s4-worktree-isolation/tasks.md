# Tasks — eos-s4-worktree-isolation

## Step 0: Branch

- [x] Create `cursor/eos-s4-worktree-isolation` from main@f1c1577 (post S3)

## Step 1: OpenSpec FIRST

- [x] `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, delta spec

## Step 2: RED — TDD suite

- [x] `tests/eos-s4-worktree-isolation.test.js` (fail until policy/lock/wire exist)
- [x] `package.json` `test:s4`

## Step 3: GREEN — policy + lock + verify wire + pointers

- [x] `docs/harness/WORKTREE_ISOLATION_POLICY.md` SSOT
- [x] `scripts/lib/worktree-policy-lock.js`
- [x] Wire `scripts/verify-eos.js` (import + REQUIRED_PATHS + audit block 3g12)
- [x] Minimal pointers in CONTEXT_PACK_TPC / LOOP_ENGINEERING_4Q
- [x] Optional CI seam-pack + assert-gha-contract + CI_CD_CONTRACT note for `test:s4`

## Step 4: Evidence + freeze

- [x] Spanish evidence `docs/releases/EOS_S4_WORKTREE_ISOLATION_2026-09-09.md`
- [x] Freeze note in `EOS_FREEZE_GATE_STATUS.md` (do **not** move main_tip)

## Step 5: Verify + push

- [x] `npm run test:s4` PASS (15/15)
- [x] `npm run verify:strict` PASS (723 checks / 0 failures; worktree-policy-lock VERIFIED)
- [x] `npm run ci:contract` PASS
- [ ] Commit + push branch; **no PR open/merge**
- [ ] Report SHA, policy path, CI-safe smoke rationale, verify results