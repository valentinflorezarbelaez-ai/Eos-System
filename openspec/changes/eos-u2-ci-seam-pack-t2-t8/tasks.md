# Tasks — eos-u2-ci-seam-pack-t2-t8

## Step 0: Branch

- [x] Create `cursor/eos-u2-ci-seam-pack-t2-t8` from U1 tip `1be178c` (base U1; rebase onto main after U1 merges if needed)

## Step 1: OpenSpec light FIRST

- [x] `.openspec.yaml`, `proposal.md`, `tasks.md`

## Step 2: CI + lock (TDD)

- [x] RED: `test:u2` fails (ci.yml missing t2..t8)
- [x] GREEN: ci.yml seam-pack adds test:t2..test:t8 (keep prior packs)
- [x] assert-gha-contract + CI_CD_CONTRACT.md U2 note
- [x] GHA-008 + m5 list extended
- [x] Evidence + freeze U2 section + matrix MEASURED

## Step 3: Verify

- [x] npm run test:u2 PASS
- [x] npm run test:m5 + github-actions-cicd PASS
- [x] assert-gha-contract PASS
- [x] Fundacion Delta=0; PRODUCTION_READY=NO; DEFER dirty unstaged

## Step 4: Push (no PR)

- [ ] Commit + push; report SHA + seams added
