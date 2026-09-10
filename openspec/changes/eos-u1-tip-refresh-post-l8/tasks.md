# Tasks — eos-u1-tip-refresh-post-l8

## Step 0: Branch

- [x] Create `cursor/eos-u1-tip-refresh-post-l8` from L9 audit / rebase onto origin/main@8781bb3

## Step 1: OpenSpec FIRST (light)

- [x] `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, delta spec

## Step 2: Tip SSOT triad

- [x] Freeze gate header + closed table T8/#90 + L9/#91 + U1 section
- [x] Capability matrix evaluated_tip + L9 audit + U1 rows
- [x] test:m4 EXPECTED_TIP + needles

## Step 3: Evidence

- [x] `docs/releases/EOS_U1_TIP_REFRESH_POST_L8_2026-09-09.md`

## Step 4: Verify

- [ ] `npm run test:m4` PASS
- [ ] PRODUCTION_READY=NO; Fundacion Delta=0; DEFER dirty

## Step 5: Push (no PR open/merge)

- [ ] Commit + push branch; report SHA + compare URL