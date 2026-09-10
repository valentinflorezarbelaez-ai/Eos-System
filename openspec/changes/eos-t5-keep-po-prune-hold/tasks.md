# Tasks — eos-t5-keep-po-prune-hold

## Step 0: Branch

- [x] Create `cursor/eos-t5-keep-po-prune-hold` from origin/main post T4 #86 (203a8ca)

## Step 1: OpenSpec light FIRST

- [x] `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`

## Step 2: Gate/HOLD + lock (TDD)

- [x] Runbook `docs/harness/KEEP_PO_PRUNE_RITUAL.md`
- [x] Evidence HOLD `docs/releases/EOS_T5_KEEP_PO_PRUNE_HOLD_2026-09-09.md`
- [x] Lock `scripts/lib/keep-po-prune-hold-lock.js` + gate CLI
- [x] `tests/eos-t5-keep-po-prune-hold.test.js` + `test:t5`
- [x] Wire verify-eos 3g16 + REQUIRED_PATHS
- [x] Freeze T5 + matrix MEASURED; TR-01 ceiling bump (130→140) with evidence

## Step 3: Verify

- [x] `npm run test:t5` PASS (9/9)
- [x] `npm run test:s5` PASS; catalog/P5 untouched
- [x] Gate CLI HOLD PASS; Fundacion Delta=0; PRODUCTION_READY=NO; DEFER dirty; no silent prune; AT_CEILING

## Step 4: Push (no PR)

- [ ] Commit + push; report SHA + DoD