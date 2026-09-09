# Tasks — eos-s3-loop-engineering-4q

## Step 0: Branch

- [x] Create `cursor/eos-s3-loop-engineering-4q` from main@897a50f (post S2 #76)

## Step 1: OpenSpec FIRST

- [x] `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, delta spec

## Step 2: RED — TDD suite

- [x] `tests/eos-s3-loop-engineering-4q.test.js` (fail until index/ADR/lock/wire exist)
- [x] `package.json` `test:s3`

## Step 3: GREEN — matrix + ADR + lock + verify wire

- [x] `docs/harness/LOOP_ENGINEERING_4Q.md` SSOT matrix + cycle
- [x] `docs/architecture/adrs/ADR-0017-loop-engineering-4q.md`
- [x] `scripts/lib/loop-engineering-lock.js`
- [x] Wire `scripts/verify-eos.js` (import + REQUIRED_PATHS + audit block 3g11)
- [x] Optional doctor NON-CLAIM Loop ≠ verify / ≠ productive autonomy

## Step 4: Evidence + freeze

- [x] Spanish evidence `docs/releases/EOS_S3_LOOP_ENGINEERING_4Q_2026-09-09.md`
- [x] Freeze note in `EOS_FREEZE_GATE_STATUS.md` (do **not** move main_tip)

## Step 5: Verify + push

- [x] `npm run test:s3` PASS (13/13)
- [x] `npm run verify:strict` PASS (707 checks / 0 failures; loop-engineering-lock VERIFIED)
- [x] TR-01 PASS (discovered 123 `<` 130; no ceiling bump)
- [ ] Commit + push branch; **no PR open/merge**
- [ ] Report SHA, ADR/doc paths, verify results
