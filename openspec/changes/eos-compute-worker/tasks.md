# Tasks — eos-compute-worker (SPEC-0008)

## Step 0: Branch

- [x] Create `cursor/eos-p2-compute-worker` from origin/main@e81af1a (tip refresh stays separate)

## Step 1: OpenSpec FIRST

- [x] `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, delta spec SPEC-0008

## Step 2: TDD RED

- [x] Add `tests/runners/eos-compute-worker.test.js` with 3 tests (happy / rollback / out-of-scope) — RED then GREEN

## Step 3: TDD GREEN

- [x] Implement `scripts/runners/eos-compute-worker.js` Tier-2 helpers
- [x] Wire optional `package.json` script `test:compute-worker`
- [x] All 3 tests PASS

## Step 4: Verify

- [x] `node --test tests/runners/eos-compute-worker.test.js` EXIT 0
- [x] `npm run verify:strict` EXIT 0
- [x] PRODUCTION_READY=NO; Fundacion Delta=0; AT_CEILING; no CloudAgent

## Step 5: Push (no PR)

- [ ] Commit + push `cursor/eos-p2-compute-worker`; report SHA
