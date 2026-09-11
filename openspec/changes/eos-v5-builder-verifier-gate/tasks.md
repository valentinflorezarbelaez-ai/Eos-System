# Tasks — eos-v5-builder-verifier-gate

## Step 0: Branch

- [x] Create feature branch `cursor/eos-v5-builder-verifier-gate`

## Step 1: OpenSpec envelope

- [x] `.openspec.yaml`, `proposal.md`, `tasks.md`

## Step 2: RED phase (TDD)

- [x] Write test suite `tests/eos-v5-builder-verifier-custody.test.js`
- [x] Add `test:v5` to `package.json`
- [x] Run `npm run test:v5` and prove fail-closed failure (RED)

## Step 3: GREEN phase (Implementation)

- [x] Implement `src/core/governance/builder-verifier-custody.js`
- [x] Integrate disjunction check into `src/core/sdd/evidence-custody.js`
- [x] Implement gate runner `scripts/ci/builder-verifier-custody-gate.js`
- [x] Run `npm run test:v5` and prove 100% pass (GREEN)

## Step 4: Seam-pack & CI Integration

- [x] Wire `npm run test:v5` into `.github/workflows/ci.yml` seam-pack
- [x] Document `test:v5` in `docs/governance/CI_CD_CONTRACT.md`
- [x] Verify `npm run verify:strict` (maintain 914/914 green)
- [x] Verify `Fundacion Delta=0`, `PRODUCTION_READY=NO`, `AT_CEILING` intact

## Step 5: Commit & Push

- [ ] Conventional commit without AI attribution
- [ ] Push to `origin/cursor/eos-v5-builder-verifier-gate`

## Step 6: CI regression — identity-bearing VERIFY_RECEIPT fixtures (PR #100)

- [x] Root cause: V5 `sealVerifyReceipt` enforces disjunction when any identity is present; older ROI4/U4 fixtures set only `verifier_id` → `BUILDER_ID_MISSING` / `CUSTODY_CHAIN_RECURRENT`
- [x] Preserve fail-closed BUILDER != VERIFIER; update fixtures to supply distinct `builder_id` + `verifier_id` (no production grandfather weaken)
- [x] Re-verify: `node --test` on ROI4 I3 + U4 deepen; `npm run test:v5`; `npm run verify:strict`

