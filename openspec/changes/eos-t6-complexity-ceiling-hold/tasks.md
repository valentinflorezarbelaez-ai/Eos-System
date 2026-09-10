# Tasks — eos-t6-complexity-ceiling-hold

## Step 0: Branch

- [x] Create `cursor/eos-t6-complexity-ceiling-hold` from T5 tip; rebase onto origin/main after T5 #87 (bf3edc7)

## Step 1: OpenSpec light FIRST

- [x] `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`

## Step 2: Gate/HOLD + lock (TDD)

- [x] Runbook `docs/harness/COMPLEXITY_CEILING_HOLD_RITUAL.md`
- [x] Evidence HOLD `docs/releases/EOS_T6_COMPLEXITY_CEILING_HOLD_2026-09-09.md`
- [x] Lock `scripts/lib/complexity-ceiling-hold-lock.js` + gate CLI
- [x] `tests/eos-t6-complexity-ceiling-hold.test.js` + `test:t6`
- [x] Wire verify-eos 3g17 + REQUIRED_PATHS
- [x] Freeze T6 + matrix MEASURED

## Step 3: Verify

- [x] `npm run test:t6` PASS (10/10)
- [x] `npm run test:r4` PASS; complexity-budget green; no new schemas
- [x] Gate CLI HOLD PASS; Fundacion Delta=0; PRODUCTION_READY=NO; DEFER dirty; AT_CEILING

## Step 4: Push (no PR)

- [x] Commit + push; report SHA + DoD
