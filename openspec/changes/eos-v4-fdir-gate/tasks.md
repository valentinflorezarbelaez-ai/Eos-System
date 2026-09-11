# Tasks — eos-v4-fdir-gate

## Step 0: Branch

- [x] Create feature branch `cursor/eos-v4-fdir-gate`

## Step 1: OpenSpec envelope

- [x] `.openspec.yaml`, `proposal.md`, `tasks.md`

## Step 2: RED phase (TDD)

- [x] Write adversarial test suite `tests/eos-v4-fdir-sentinel-adversarial.test.js`
- [x] Add `test:v4` to `package.json`
- [x] Run `npm run test:v4` and prove fail-closed failure (RED)

## Step 3: GREEN phase (Implementation)

- [x] Implement `scripts/ci/fdir-sentinel-adversarial-gate.js`
- [x] Run `npm run test:v4` and prove 100% pass (GREEN)

## Step 4: Seam-pack & CI Integration

- [x] Wire `npm run test:v4` into `.github/workflows/ci.yml` seam-pack
- [x] Document `test:v4` in `docs/governance/CI_CD_CONTRACT.md`
- [x] Verify `npm run verify:strict` (maintain 914/914 green)
- [x] Verify `Fundacion Delta=0`, `PRODUCTION_READY=NO`, `AT_CEILING` intact

## Step 5: Commit & Push

- [x] Conventional commit without AI attribution
- [x] Push to `origin/cursor/eos-v4-fdir-gate`
