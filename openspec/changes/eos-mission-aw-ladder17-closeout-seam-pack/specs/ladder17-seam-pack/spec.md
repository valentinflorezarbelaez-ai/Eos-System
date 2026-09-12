# SPEC-0054: Ladder 17 CI Seam-Pack Consolidation & Closeout

## 1. Overview
Consolidates the four Ladder 17 satellites into the fail-closed CI pipeline:
- **AS (SPEC-0050):** `test:cross-satellite-composition`
- **AT (SPEC-0051):** `test:operator-continuity`
- **AU (SPEC-0052):** `test:law-vi-broker`
- **AV (SPEC-0053):** `test:freeze-drift`

## 2. Requirements (EARS Syntax)

### Event-Driven Requirements
- **FR-AW-01:** WHEN the CI seam-pack job runs, THE SYSTEM SHALL execute all four Ladder 17 satellites fail-closed without `continue-on-error`.
- **FR-AW-02:** WHEN `npm run test:ladder17-pack` is invoked, THE SYSTEM SHALL execute the sequential chain of `test:cross-satellite-composition`, `test:operator-continuity`, `test:law-vi-broker`, `test:freeze-drift`, and `test:mission-aw`.
- **FR-AW-03:** WHEN `scripts/ci/assert-gha-contract.js` is executed, THE SYSTEM SHALL assert that all four satellite test commands exist in `.github/workflows/ci.yml`.

### State-Driven Requirements
- **FR-AW-04:** WHILE the test discovery engine scans `./tests`, THE SYSTEM SHALL exclude `eos-aw-ladder17-seam-pack.test.js` so that `SLIM_COUNT` does not exceed 145.
- **FR-AW-05:** WHILE evaluating release status, THE SYSTEM SHALL maintain `PRODUCTION_READY: NO` and `Fundacion: Delta=0`.

## 3. Acceptance Criteria (BDD)

```gherkin
SCENARIO: CI Seam Pack Execution
  GIVEN a standard CI environment on GitHub Actions
  WHEN the seam-pack job triggers
  THEN tests for AS, AT, AU, and AV must execute sequentially
  AND zero failures must occur for the job to pass

SCENARIO: Budget Invariant Check
  GIVEN the slim test discovery runner
  WHEN all active tests are evaluated
  THEN SLIM_COUNT must be less than or equal to 145
```
