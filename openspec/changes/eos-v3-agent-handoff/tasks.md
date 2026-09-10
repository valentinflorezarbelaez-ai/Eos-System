# Tasks — eos-v3-agent-handoff

## Step 0: Branch

- [x] Create feature branch `cursor/eos-v3-agent-handoff`

## Step 1: OpenSpec envelope

- [x] `.openspec.yaml`, `proposal.md`, `tasks.md`

## Step 2: RED phase (TDD)

- [x] Write `tests/agent-handoff-envelope.test.js` with comprehensive contract tests
- [x] Add `test:v3` to `package.json`
- [x] Run `npm run test:v3` and prove fail-closed failure (RED)

## Step 3: GREEN phase (Implementation)

- [x] Implement `src/core/orchestration/agent-handoff-envelope.js`
- [x] Run `npm run test:v3` and prove 100% pass (GREEN)

## Step 4: Verification & Integrity

- [x] Run `npm run verify:strict` (maintain 914/914 green)
- [x] Run `npm run test:v2` and `npm run test:u7`
- [x] Verify `Fundacion Delta=0`, `PRODUCTION_READY=NO`, `AT_CEILING` intact

## Step 5: Commit & Push

- [x] Conventional commit without AI attribution
- [x] Push to `origin/cursor/eos-v3-agent-handoff`
