# Tasks — eos-v6-l10-closeout

## Step 0: Branch

- [x] Create feature branch `cursor/eos-v6-l10-closeout`

## Step 1: OpenSpec envelope

- [x] `.openspec.yaml`, `proposal.md`, `tasks.md`

## Step 2: Release Closeout Deliverable

- [x] Write `docs/releases/EOS_LADDER_10_CLOSEOUT_2026-09-10.md`
- [x] Update `docs/releases/RELEASE_CAPABILITY_MATRIX.md` with Ladder 10 status
- [x] Update `docs/releases/EOS_FREEZE_GATE_STATUS.md` with Ladder 10 summary

## Step 3: Verification & Invariant Audit

- [x] Run `npm run test:v2` through `npm run test:v5` (all pass)
- [x] Run `npm run verify:strict` (all 914+ checks pass)
- [x] Verify `Fundacion Delta=0`, `App de Fuerza Delta=0`, `AT_CEILING` (35/35 schemas)

## Step 4: Commit & Push

- [ ] Conventional commit without AI attribution
- [ ] Push to `origin/cursor/eos-v6-l10-closeout`
