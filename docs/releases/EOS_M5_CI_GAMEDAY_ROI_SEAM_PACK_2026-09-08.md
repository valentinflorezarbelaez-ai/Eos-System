# EOS M5 CI GameDay / ROI seam pack - 2026-09-08

**Branch:** `cursor/eos-m5-ci-gameday-seam-pack`
**Base main tip:** `444dfc6e69d466e035acefb84ea815914c8ffde2` (M4 #42 merged)
**Scope:** M5 ONLY (Ladder 2 G5) - EOS-only
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (unchanged)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (untouched)

## Goal (G5 / M5 DoD)

CI must explicitly run CI-safe gameday long-run (default N=25) and named ROI/M verify scripts. Fundacion delta-0 still hard-fails on every job (including the new one).

## Deliverables

1. `.github/workflows/ci.yml` — 5th fail-closed job `seam-pack` (`CI GameDay / ROI seam pack`)
   - package script `gameday:long-run` (CI-fast default N; no soak)
   - Named pack scripts: `test:roi3` `test:roi4` `test:roi5` `test:roi6` `test:m1` `test:m2` `test:m3` `test:m4`
   - Fundacion freeze delta-0
   - timeout-minutes: 20
2. `docs/governance/CI_CD_CONTRACT.json` + `.md` — jobs list + table row + HITL note
3. `scripts/ci/assert-gha-contract.js` — assert `gameday:long-run` / `seam-pack` / `test:roi3`
4. TDD: `tests/github-actions-cicd.test.js` GHA-008 + `tests/eos-m5-ci-gameday-seam-pack.test.js` + `test:m5`
5. This release note + freeze note M5 section
6. Dirty unstaged DEFERRED (unchanged)

## Branch protection HITL caveat

Adding a 5th CI check means the GitHub branch-protection **required-check list may need HITL update** to include `CI GameDay / ROI seam pack`. This change set does **not** invent GH enforcement. Status remains **RULE_CREATED_NOT_ENFORCED** (Free private) per `ROI3_BRANCH_PROTECTION_HITL.md`.

## Verify

```text
node scripts/ci/assert-gha-contract.js
node --test tests/eos-m5-ci-gameday-seam-pack.test.js
node --test tests/github-actions-cicd.test.js
node scripts/verify-eos.js --strict
```

## Non-claims

- No App Fuerza. No Fundacion mutation.
- No M6+ in this branch.
- No soak default; CI-safe N only.
- push + compare only; do not merge without PO.
- PRODUCTION_READY remains NO.
- Local surrogate / rule present is not GH enforcement.
