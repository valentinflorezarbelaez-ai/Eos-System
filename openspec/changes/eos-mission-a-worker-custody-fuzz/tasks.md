# Tasks — eos-mission-a-worker-custody-fuzz (Mission A)

## Step 0: Branch

- [x] Create `grok/mission-a-worker-custody-fuzz` from origin/main (~2d58d51 / #103+)

## Step 1: OpenSpec FIRST

- [x] `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, short delta spec

## Step 2: TDD RED

- [x] Add `tests/runners/eos-compute-worker-fuzz.test.js`
  - [x] parseCheckboxTasks: malformed / unclosed / unicode / path traversal fail-closed
  - [x] assertBuilderVerifierDisjunction: identical + spoofed same token fail-closed
  - [x] rollback: verify failure restores clean simulated working tree
- [x] Wire fuzz file into `npm run test:compute-worker`

## Step 3: TDD GREEN

- [x] Minimal worker/custody hardening only where tests prove gaps
- [x] Do not weaken V5; do not flip PRODUCTION_READY; Fundacion Δ=0; no new deps; AT_CEILING

## Step 4: Verify

- [x] `npm run test:compute-worker` EXIT 0
- [x] `npm run test:v5` EXIT 0
- [x] `npm run verify:strict` EXIT 0 (914 checks)

## Step 5: Commit + push (no PR)

- [ ] Conventional commit without Co-Authored-By / AI attribution
- [ ] Push branch; leave DEFER untracked unstaged; no PR