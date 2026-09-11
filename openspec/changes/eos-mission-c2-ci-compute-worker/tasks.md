# Tasks — eos-mission-c2-ci-compute-worker

## Step 0: Branch

- [x] Fetch origin/main; worktree `Eos-mission-c2` on `grok/mission-c2-ci-compute-worker` (do not thrash Eos-mission-c1b)

## Step 1: OpenSpec light FIRST

- [x] `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`

## Step 2: CI + lock (TDD)

- [x] RED: `test:c2` fails (ci.yml missing `test:compute-worker`)
- [x] GREEN: ci.yml seam-pack adds `test:u2` + `test:compute-worker` (+ `test:c2`); keep prior packs
- [x] assert-gha-contract + CI_CD_CONTRACT.md C2 note + table
- [x] GHA-008 + m5 list extended; SLIM_SUITE_EXCLUDES holds ≤145
- [x] package.json `test:c2`

## Step 3: Verify

- [x] npm run test:c2 PASS
- [x] npm run test:compute-worker PASS
- [x] npm run verify:strict EXIT 0; slim ≤145; Fundacion Δ=0; PRODUCTION_READY=false; no new deps

## Step 4: Push (no PR)

- [x] Commit `ci: add test:compute-worker to seam-pack` + push; report branch/SHA/job/verify
