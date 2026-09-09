# Tasks — eos-r6-complexity-budget-verify-closeout

## Step 0: Setup feature branch (MANDATORY FIRST)

- [x] Create and switch to `cursor/eos-r6-complexity-budget-verify-closeout` from main tip `2e0463991c326beb0c04212296cbd9f63915bb36`
- Evidence: `git rev-parse --abbrev-ref HEAD` / `git rev-parse HEAD`

## Step 1: OpenSpec artifacts FIRST

- [x] Create `openspec/changes/eos-r6-complexity-budget-verify-closeout/` with `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, delta `specs/complexity-budget-verify-closeout/spec.md`
- Consulted: `openspec/config.yaml`, `docs/openspec-tasks-mandatory-steps.md`, R4/R5 OpenSpec + R2 CI seam pattern
- Decision documented: **K6 CLOSED_BY_R4**; R6 = CI + meta-tests + NON-CLAIM evidence only

## Step 2: TDD RED

- [x] Add `tests/eos-r6-complexity-budget-verify-closeout.test.js` that FAIL before CI/contract updates (missing test:r4/r5 in seam-pack)
- Evidence command: `node --test tests/eos-r6-complexity-budget-verify-closeout.test.js` (expect non-zero)

## Step 3: GREEN — CI seam-pack + contract surfaces

- [x] Add `test:r4` + `test:r5` to `.github/workflows/ci.yml` seam-pack job
- [x] Update `docs/governance/CI_CD_CONTRACT.md` table + R6 seam-pack note
- [x] Extend `scripts/ci/assert-gha-contract.js` asserts for test:r4 + test:r5
- [x] Update `tests/eos-m5-ci-gameday-seam-pack.test.js` + `tests/github-actions-cicd.test.js` GHA-008
- [x] Add `package.json` script `test:r6`
- Do **not** reimplement complexity-budget-lock

## Step 4: Triangulate edge cases (meta-tests)

- [x] verify-eos imports/wires complexity-budget-lock / auditComplexityBudgetLock
- [x] CI + contract list test:r4 and test:r5
- [x] NON-CLAIM candado ≠ prune in evidence
- [x] package.json test:r6 exists
- Evidence: `npm run test:r6` + `npm run test:r2` + `npm run test:m5`

## Step 5: Spanish evidence + freeze

- [x] `docs/releases/EOS_R6_COMPLEXITY_BUDGET_VERIFY_CLOSEOUT_2026-09-09.md`
- [x] Freeze note in `docs/releases/EOS_FREEZE_GATE_STATUS.md` stating Ladder 6 R1–R6 close pending this merge
- Leave DEFER dirty unstaged
- Skip optional doctor/fusion-light

## Step 6: Review / update existing unit tests (regression baseline)

- [x] Confirm `test:r4`, `test:r5`, `test:r2`, `test:m5`, GHA-008 still PASS after list updates
- [x] Confirm TR-01 ceiling: live count after +1 file still `< 130` (no hide tests)

## Step 7: Agent-executed verification (MANDATORY — zero user delegation)

- [x] Run `npm run test:r6`
- [x] Run `npm run test:r4` and `npm run test:r5`
- [x] Run `npm run test:r2` / `npm run test:m5`
- [x] Run `npm run verify:strict`
- [x] Capture exit codes in evidence doc

## Step 8: Endpoint / API contract verification

- [x] N/A for UI/HTTP — R6 is CI/meta-test governance. Surrogate: `node scripts/ci/assert-gha-contract.js` (or via test:m5) + `node scripts/verify-eos.js --strict --json` includes complexity-budget-lock checks

## Step 9: UI and E2E

- [x] N/A — no operator UI surface in R6

## Step 10: Commit + push (no PR merge)

- [x] Commit R6 artifacts only (do not stage DEFER dirty)
- [x] Push branch `cursor/eos-r6-complexity-budget-verify-closeout`
- [x] Do NOT open/merge PR
