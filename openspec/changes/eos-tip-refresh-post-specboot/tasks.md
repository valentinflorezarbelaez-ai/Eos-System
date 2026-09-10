# Tasks — eos-tip-refresh-post-specboot

## Step 0: Branch

- [x] Create `cursor/eos-tip-refresh-post-specboot` from main@b785f01

## Step 1: OpenSpec FIRST (light)

- [x] `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, delta spec

## Step 2: Tip SSOT triad

- [x] Freeze gate header + closed table S1–S4/#79 + tip-refresh section
- [x] Capability matrix evaluated_tip + S1–S4 + SpecBoot rows
- [x] test:m4 EXPECTED_TIP + needles

## Step 3: Evidence

- [x] `docs/releases/EOS_TIP_REFRESH_POST_SPECBOOT_2026-09-09.md`

## Step 4: Verify

- [ ] `npm run test:m4` PASS
- [ ] PRODUCTION_READY=NO; Fundacion Delta=0; DEFER dirty

## Step 5: Push (no PR open/merge)

- [ ] Commit + push branch; report SHA + compare URL
