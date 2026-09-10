# Tasks — eos-t4-mission-os-evd-observe-pack

## Step 0: Branch

- [x] Create `cursor/eos-t4-mission-os-evd-observe-pack` from origin/main post T3 #85 (428106f)

## Step 1: OpenSpec light FIRST

- [x] `.openspec.yaml`, `proposal.md`, `tasks.md`

## Step 2: TDD + implement

- [x] RED/GREEN: test:t4 + observe pack (coherence + sealEvd + tip ALIGNED)
- [x] CLI scripts/ci + package.json observe:mission-os-evd / test:t4
- [x] verify-eos REQUIRED_PATHS
- [x] Evidence + freeze T4 + matrix

## Step 3: Verify

- [x] npm run test:t4 PASS (7/7)
- [x] npm run observe:mission-os-evd PASS
- [x] Fundacion Delta=0; PRODUCTION_READY=NO; DEFER dirty; no silent MCP prune; AT_CEILING

## Step 4: Push (no PR)

- [ ] Commit + push; report SHA + DoD