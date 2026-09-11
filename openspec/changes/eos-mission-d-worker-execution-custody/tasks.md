# Tasks — eos-mission-d-worker-execution-custody (Mission D)

## Step 0: Branch

- [x] Create isolated worktree Eos-mission-d + branch grok/mission-d-worker-execution-custody from origin/main (~db10bd3 / #109)

## Step 1: OpenSpec FIRST

- [x] .openspec.yaml, proposal.md, design.md, 	asks.md, delta spec

## Step 2: TDD + implement

- [x] Atomic partial-apply rollback → APPLY_FAILED_ROLLED_BACK
- [x] EvidenceCustody sealVerifyReceipt on COMPLETED
- [x] Tier-2 CLI eos-compute-worker-cli.js
- [x] Tests: partial-apply, custody receipt, CLI exit codes
- [x] Update adversarial suite for new apply-fail contract
- [x] Add new test basenames to SLIM_SUITE_EXCLUDES; wire 	est:compute-worker

## Step 3: Verify

- [x] 
pm run test:compute-worker ALL PASS
- [x] 
pm run test:v5 ALL PASS
- [x] slim discovery ≤145
- [x] 
pm run verify:strict EXIT 0 (914+)

## Step 4: Commit + push (no PR)

- [x] Conventional commit; push origin grok/mission-d-worker-execution-custody; no PR; no AI attribution
