# Tasks ? eos-mission-b-sensor-mutation-fortify (Mission B)

## Step 0: Branch

- [x] Create `grok/mission-b-sensor-mutation-fortify` from origin/main (~2d58d51 / #103+)

## Step 1: OpenSpec FIRST

- [x] `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, short delta spec

## Step 2: TDD RED (mutation oracles)

- [x] Add `tests/eos-mission-b-sensor-mutation-fortify.test.js`
  - [x] V5: ZWSP/format spoof + inverted allow-all mutant ? production FAIL-CLOSED
  - [x] U7: temp invented SpecBoot checklist path ? audit FAIL-CLOSED; inverted mutant would PASS
  - [x] T8: NON-MUTATING gate tree snapshot + ritual NON-MUTATING strip FAIL-CLOSED
- [x] Wire `npm run test:mission-b`

## Step 3: TDD GREEN

- [x] Minimal V5 custody identity normalize only where mutation proves gap
- [x] Do not weaken U7/T8; no PRODUCTION_READY flip; Fundacion ?=0; no new deps; AT_CEILING; preserve verify 914

## Step 4: Verify

- [x] `npm run test:mission-b` EXIT 0
- [x] `npm run test:v5` + `test:u7` + `test:t8` EXIT 0
- [x] `npm run verify:strict` EXIT 0 (914 checks)

## Step 5: Commit + push (no PR)

- [x] Conventional commit without Co-Authored-By / AI attribution
- [x] Push branch; leave DEFER untracked unstaged; no PR
