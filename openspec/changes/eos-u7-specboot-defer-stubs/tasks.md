# Tasks — eos-u7-specboot-defer-stubs

## Step 0: Branch

- [x] Create `cursor/eos-u7-specboot-defer-stubs` from U6 tip @ 69a1ff9 (base U6; parent opening PR)

## Step 1: OpenSpec light FIRST

- [x] `.openspec.yaml`, `proposal.md`, `tasks.md`

## Step 2: TDD + implement

- [x] RED/GREEN: test:u7 + SpecBoot DEFER stubs lock/ritual (INDEX_STUBS; no Gentleman invent)
- [x] Promote three INDEX stubs (tracked); leave ai-specs DEFER unstaged
- [x] Gate scripts/ci + package.json test:u7
- [x] verify-eos REQUIRED_PATHS
- [x] Evidence + freeze U7 + matrix; SPECBOOT_CYCLE + base-standards pointers

## Step 3: Verify

- [x] npm run test:u7 PASS
- [x] node scripts/ci/specboot-defer-stubs-gate.js → mode INDEX_STUBS
- [x] Fundacion Delta=0; PRODUCTION_READY=NO; ai-specs DEFER unstaged; AT_CEILING

## Step 4: Push (no PR)

- [x] Commit + push; report SHA + disposition INDEX_STUBS
