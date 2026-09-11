# Tasks — eos-v2-token-hygiene

## Step 0: Branch

- [x] Create feature branch `cursor/eos-v2-token-hygiene`

## Step 1: OpenSpec envelope

- [x] `.openspec.yaml`, `proposal.md`, `tasks.md`

## Step 2: RED phase (TDD)

- [x] Write `tests/bounded-output-filter.test.js` with comprehensive boundary test scenarios
- [x] Add `test:v2` to `package.json`
- [x] Run `npm run test:v2` and prove that it fails (RED)

## Step 3: GREEN phase (Implementation)

- [x] Implement pure utility `src/core/runtime/bounded-output-filter.js`
- [x] Run `npm run test:v2` and prove 100% pass (GREEN)

## Step 4: Verification & Integrity

- [x] Run `npm run verify:strict` (maintain 914/914 green)
- [x] Verify `Fundacion Delta=0`, `PRODUCTION_READY=NO`, `AT_CEILING` intact

## Step 5: Commit & Push

- [x] Conventional commit without AI attribution
- [x] Push to `origin/cursor/eos-v2-token-hygiene`
