# Tasks — eos-u5-agy-admin-hitl-checklist

## Step 0: Branch

- [x] Create `cursor/eos-u5-agy-admin-hitl-checklist` from U4 tip `91ba71c` (cursor/eos-u4-mission-os-deepen)

## Step 1: OpenSpec light FIRST

- [x] `.openspec.yaml`, `proposal.md`, `tasks.md`

## Step 2: TDD + implement

- [x] RED/GREEN: test:u5 + Admin HITL lock/checklist (extend T7; fail-closed DAEMON_ABSENT unless PRESENT proven)
- [x] CLI scripts/ci + package.json test:u5
- [x] verify-eos REQUIRED_PATHS
- [x] Evidence + freeze U5 + matrix; AGY checklist + ANTIGRAVITY_FIRST pointers
- [x] Do NOT run Admin install; adminRequired=true documented only

## Step 3: Verify

- [x] npm run test:u5 PASS
- [x] npm run test:t7 PASS (baseline intact)
- [x] node scripts/ci/agy-admin-hitl-checklist.js → mode DAEMON_ABSENT; installExecuted=false
- [x] Fundacion Delta=0; PRODUCTION_READY=NO; DEFER dirty; AT_CEILING

## Step 4: Push (no PR)

- [ ] Commit + push; report SHA + clear DAEMON_ABSENT status
