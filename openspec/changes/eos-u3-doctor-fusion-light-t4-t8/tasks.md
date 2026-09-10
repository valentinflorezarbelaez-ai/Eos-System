# Tasks — eos-u3-doctor-fusion-light-t4-t8

## Step 0: Branch

- [x] Create `cursor/eos-u3-doctor-fusion-light-t4-t8` from U2 tip; rebase onto origin/main after #93 (U2) merges @ 782c612

## Step 1: OpenSpec light FIRST

- [x] `.openspec.yaml`, `proposal.md`, `tasks.md`

## Step 2: TDD + implement

- [x] RED/GREEN: test:u3 + operator-doctor POST_FUSION T4–T8 + fusion-light light exports
- [x] Adjust n3/n5/q3/r3/t3 fixtures for new paths/ids
- [x] package.json test:u3; verify-eos REQUIRED_PATHS
- [x] Evidence + freeze U3 + matrix

## Step 3: Verify

- [x] npm run test:u3 PASS
- [x] npm run test:n3 + test:n5 + test:q3 + test:r3 + test:t3 PASS
- [x] Fundacion Delta=0; PRODUCTION_READY=NO; DEFER dirty; no silent MCP prune

## Step 4: Push (no PR)

- [x] Rebase onto origin/main @ 782c612; commit + push; report SHA + DoD
