# Tasks — eos-s2-context-pack-tpc

## Step 0: Branch

- [x] Create `cursor/eos-s2-context-pack-tpc` from main@aa28b59 (post S1 #75)

## Step 1: OpenSpec FIRST

- [x] `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, delta spec

## Step 2: RED — TDD suite

- [x] `tests/eos-s2-context-pack-tpc.test.js` (fail until index/lock/wire exist)
- [x] `package.json` `test:s2`

## Step 3: GREEN — index + lock + verify wire

- [x] `docs/harness/CONTEXT_PACK_TPC.md` SSOT index
- [x] `scripts/lib/context-pack-lock.js`
- [x] Wire `scripts/verify-eos.js` (import + REQUIRED_PATHS + audit block)
- [x] Optional one-line AGENTS.md / CLAUDE.md pointer

## Step 4: Evidence + freeze

- [x] Spanish evidence `docs/releases/EOS_S2_CONTEXT_PACK_TPC_2026-09-09.md`
- [x] Freeze note in `EOS_FREEZE_GATE_STATUS.md` (do **not** move main_tip)

## Step 5: Verify + push

- [x] `npm run test:s2` PASS (12/12)
- [x] `npm run verify:strict` PASS (692 checks / 0 failures; context-pack-lock VERIFIED)
- [ ] Commit + push branch; **no PR open/merge**
- [ ] Report SHA, index path, verify results
