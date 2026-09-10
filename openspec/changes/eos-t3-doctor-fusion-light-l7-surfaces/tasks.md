# Tasks — eos-t3-doctor-fusion-light-l7-surfaces

## Step 0: Branch

- [x] Create `cursor/eos-t3-doctor-fusion-light-l7-surfaces` from T2 tip; rebase onto origin/main after #84 (T2) merges

## Step 1: OpenSpec light FIRST

- [x] `.openspec.yaml`, `proposal.md`, `tasks.md`

## Step 2: TDD + implement

- [x] RED/GREEN: test:t3 + operator-doctor POST_FUSION L7 + fusion-light light exports
- [x] Adjust n3/n5/q3/r3 fixtures for new paths/ids
- [x] package.json test:t3; verify-eos REQUIRED_PATHS
- [x] Evidence + freeze T3 + matrix

## Step 3: Verify

- [x] npm run test:t3 PASS
- [x] npm run test:n3 + test:n5 + test:q3 + test:r3 PASS
- [x] Fundacion Delta=0; PRODUCTION_READY=NO; DEFER dirty; no silent MCP prune

## Step 4: Push (no PR)

- [x] Rebase onto origin/main @ 9c41322; commit + push; report SHA + DoD
