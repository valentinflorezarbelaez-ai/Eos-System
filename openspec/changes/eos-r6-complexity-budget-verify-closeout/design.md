# Design — R6 complexity-budget verify closeout

## Context

- K6 DoD core (verify:strict fails closed if status/count/counting_rule ≠ filesystem) was delivered in **R4**:
  - `scripts/lib/complexity-budget-lock.js` → `auditComplexityBudgetLock`
  - `scripts/verify-eos.js` block **3g9** (strict only)
  - `tests/eos-r4-at-ceiling-schema-gate.test.js` + `test:r4`
  - NON-CLAIM already in R4 evidence: Gate ≠ executed prune
- R5 delivered deferred-writers Choice B lock + `test:r5` (not yet in CI seam-pack)
- R2 sealed Ladder5 Q locks into CI; R6 seals Ladder6 R4/R5 locks into CI

## Decisions

1. **K6 CLOSED_BY_R4** — do not add a second lock module or re-wire a duplicate audit. R6 only proves the existing import/wire surface and seals CI.
2. Extend seam-pack with `npm run test:r4` and `npm run test:r5` (both already exist, CI-safe, fast node:test suites).
3. Update contract surfaces in lockstep (mirror R2): `CI_CD_CONTRACT.md` table + R6 note; `assert-gha-contract.js`; `eos-m5-ci-gameday-seam-pack.test.js`; `github-actions-cicd.test.js` GHA-008; `eos-r2-ci-seam-pack-q-tests.test.js` list keeps prior packs and R6 adds r4/r5 expectations via `test:r6`.
4. Meta-test `test:r6` asserts:
   - verify-eos source imports `complexity-budget-lock` and `auditComplexityBudgetLock`
   - CI yaml + contract document `test:r4` and `test:r5`
   - NON-CLAIM candado ≠ prune present in R4 and/or R6 evidence
5. Skip doctor/fusion-light optional (R4 already claimed doctor ≠ verify; avoid TR-01/surface bloat).

## NON-claims

- R6 closeout ≠ reimplementation of complexity-budget-lock
- Candado ≠ executed prune / P6 quarantine
- CI seam listing ≠ GH branch-protection enforcement (still RULE_CREATED_NOT_ENFORCED)
- PRODUCTION_READY remains NO; Fundacion Δ=0
