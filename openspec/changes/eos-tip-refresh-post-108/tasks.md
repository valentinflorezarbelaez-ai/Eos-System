# Tasks — eos-tip-refresh-post-108

## Step 0: Branch

- [x] Create `grok/tip-refresh-post-108` from origin/main@dd6d7c3 (isolated worktree Eos-tip-108)

## Step 1: OpenSpec FIRST (light)

- [x] `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, delta spec

## Step 2: Tip SSOT triad

- [x] Freeze gate header + tip refresh post #108 section
- [x] Capability matrix evaluated_tip + tip refresh post #108 row
- [x] test:m4 EXPECTED_TIP + needles tip refresh post #108
- [x] dirty-defer tip honesty pin to live tip

## Step 3: Evidence

- [x] `docs/releases/EOS_TIP_REFRESH_POST_108_2026-09-11.md`

## Step 4: Verify

- [x] `npm run test:m4` PASS
- [x] `npm run verify:strict` PASS (914/0)
- [x] PRODUCTION_READY=NO; Fundacion Delta=0; DEFER dirty

## Step 5: Push (no PR open/merge)

- [x] Commit + push branch; report SHA + tip pin (NO PR)