# Tasks — eos-u6-openspec-cli-hold

## Step 0: Branch

- [x] Create `cursor/eos-u6-openspec-cli-hold` from U5 tip; rebase onto `origin/main` @ 1f13dc3 (U5 #96)

## Step 1: OpenSpec light FIRST

- [x] `.openspec.yaml`, `proposal.md`, `tasks.md`

## Step 2: TDD + implement

- [x] RED/GREEN: test:u6 + OpenSpec CLI HOLD lock/ritual (fail-closed ABSENT → HOLD; PRESENT → smoke; no invent install)
- [x] CLI gate scripts/ci + package.json test:u6
- [x] verify-eos REQUIRED_PATHS
- [x] Evidence + freeze U6 + matrix; ANTIGRAVITY_FIRST + OPENSPEC_RUNTIME pointers
- [x] Do NOT run npm install -g; do NOT invent PRESENT

## Step 3: Verify

- [x] npm run test:u6 PASS
- [x] node scripts/ci/openspec-cli-hold-gate.js → mode CLI_ABSENT_HOLD (or PRESENT_SMOKE if proven)
- [x] Fundacion Delta=0; PRODUCTION_READY=NO; DEFER dirty; AT_CEILING

## Step 4: Push (no PR)

- [x] Commit + push; report SHA + CLI present/absent
