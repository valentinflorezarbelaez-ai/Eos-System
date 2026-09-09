# EOS P2 CI seam-pack N2-N6 - 2026-09-08

**Branch:** `cursor/eos-p2-ci-seam-pack-n2-n6`
**Base main tip:** `943756e0f58c0de61ec451f843e4eab89aba0f64` (P1 #54 merged)
**Scope:** P2 ONLY (Ladder 4 J2) - EOS-only
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (unchanged)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (untouched)
**Merge:** NO (push + compare only)

## Goal (P2 / J2 DoD)

CI seam-pack must run CI-safe `test:n2`..`test:n6` in addition to existing gameday + roi3-6 + m1-m4. Fundacion delta-0 still hard-fails. No soak. No new GH billing / enforcement claims.

## Deliverables

1. `.github/workflows/ci.yml` — seam-pack named pack adds `test:n2`..`test:n6` (step title notes incl. N2-N6)
2. `docs/governance/CI_CD_CONTRACT.md` — table row + P2 seam-pack note
3. `scripts/ci/assert-gha-contract.js` — assert `test:n2` / `test:n6`
4. TDD: `tests/eos-p2-ci-seam-pack-n2-n6.test.js` + `test:p2`; GHA-008 + eos-m5 pack list extended
5. This release note + freeze note P2 section
6. Dirty unstaged DEFERRED (unchanged)

## Branch protection HITL caveat

No new CI job / display name. Existing 5th check `CI GameDay / ROI seam pack` now covers N2-N6 scripts. Status remains **RULE_CREATED_NOT_ENFORCED** (Free private). No billing claims.

## Verify

```text
node scripts/ci/assert-gha-contract.js
node --test tests/eos-p2-ci-seam-pack-n2-n6.test.js
node --test tests/eos-m5-ci-gameday-seam-pack.test.js
node --test tests/github-actions-cicd.test.js
node scripts/verify-eos.js --strict
```

## Non-claims

- No App Fuerza. No Fundacion mutation.
- No P3+ in this branch.
- No soak default; CI-safe N-tests only.
- push + compare only; do not merge without PO.
- PRODUCTION_READY remains NO.
- Local surrogate / rule present is not GH enforcement.
- No new GH billing / Team / visibility claims.
