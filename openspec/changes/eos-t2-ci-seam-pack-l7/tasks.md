# Tasks — eos-t2-ci-seam-pack-l7

## Step 0: Branch

- [x] Create `cursor/eos-t2-ci-seam-pack-l7` from L7 closeout tip; rebase onto origin/main @ 3b29184 (#83) before push

## Step 1: OpenSpec light FIRST

- [x] `.openspec.yaml`, `proposal.md`, `tasks.md`

## Step 2: CI + lock

- [x] ci.yml seam-pack: test:s2,s3,s5,s6,specboot-agy (keep s4)
- [x] assert-gha-contract + CI_CD_CONTRACT.md T2 note
- [x] test:t2 + GHA-008 + m5 list
- [x] Evidence + freeze + matrix

## Step 3: Verify

- [ ] npm run test:t2 PASS
- [ ] npm run test:m5 + github-actions-cicd PASS
- [ ] local s2/s3/s4/s5/s6/specboot-agy green enough for lock proof
- [ ] Fundacion Delta=0; PRODUCTION_READY=NO; DEFER dirty

## Step 4: Push (no PR)

- [ ] Commit + rebase onto origin/main + push; report SHA + seams
