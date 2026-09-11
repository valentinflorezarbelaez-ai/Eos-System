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

## Step 5: PR #100 CI blocker — BUILDER_ID_MISSING / CUSTODY_CHAIN_RECURRENT

- [x] Reproduce Node suite failures on `cursor/eos-v6-l10-closeout`
- [x] Fix identity-partial VERIFY_RECEIPT fixtures (ROI4 I3 + U4 deepen) without weakening V5 custody gate
- [x] Append evidence note to Ladder 10 closeout release doc
- [x] `verify:strict` EXIT 0; `test:v5` EXIT 0; previously failing tests EXIT 0

