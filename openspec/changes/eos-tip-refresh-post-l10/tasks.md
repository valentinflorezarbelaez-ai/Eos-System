# Tasks — eos-tip-refresh-post-l10

## Step 0: Branch

- [x] Create `cursor/eos-tip-refresh-post-l10` from origin/main@e81af1a

## Step 1: OpenSpec FIRST (light)

- [x] `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, delta spec

## Step 2: Tip SSOT triad

- [x] Freeze gate header + tip refresh post L10 section
- [x] Capability matrix evaluated_tip + tip refresh post L10 row
- [x] test:m4 EXPECTED_TIP + needles L9/L10/tip refresh

## Step 3: Evidence

- [x] `docs/releases/EOS_TIP_REFRESH_POST_L10_2026-09-11.md`

## Step 4: Verify

- [x] `npm run test:m4` PASS
- [x] `npm run verify:strict` PASS
- [x] PRODUCTION_READY=NO; Fundacion Delta=0; DEFER dirty

## Step 5: Push (no PR open/merge)

- [ ] Commit + push branch; report SHA + compare URL
