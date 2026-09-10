# Tasks — eos-t7-agy-workstation-evidence

## Step 0: Branch

- [x] Create `cursor/eos-t7-agy-workstation-evidence` from T6 tip; rebased onto origin/main after T6 #88 @ 757f2de

## Step 1: OpenSpec light FIRST

- [x] `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`

## Step 2: Checklist + evidence + lock (TDD)

- [x] Checklist `docs/harness/AGY_WORKSTATION_CHECKLIST.md`
- [x] Evidence `docs/releases/EOS_T7_AGY_WORKSTATION_EVIDENCE_2026-09-09.md` (honest ABSENT daemon)
- [x] Lock `scripts/lib/agy-workstation-lock.js` + smoke `scripts/ci/agy-workstation-smoke.js`
- [x] `tests/eos-t7-agy-workstation-evidence.test.js` + `test:t7`
- [x] Wire verify-eos 3g18 + REQUIRED_PATHS
- [x] Freeze T7 + matrix MEASURED; ANTIGRAVITY_FIRST.md pointer

## Step 3: Verify

- [x] `npm run test:t7` PASS (11/11)
- [x] Smoke gate PASS (daemon absent honest; no Admin)
- [x] Fundacion Delta=0; PRODUCTION_READY=NO; DEFER dirty; AT_CEILING

## Step 4: Push (no PR)

- [x] Commit + push; report SHA + DoD
