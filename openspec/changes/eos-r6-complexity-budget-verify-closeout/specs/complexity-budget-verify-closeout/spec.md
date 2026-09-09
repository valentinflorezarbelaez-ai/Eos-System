# Complexity Budget Verify Closeout (R6 delta)

Capability: seal Ladder 6 K6 closeout honestly — K6 CLOSED_BY_R4; CI + meta-tests + NON-CLAIM.

## Requirements

### Requirement: K6 CLOSED_BY_R4 documented

R6 SHALL document that the K6 verify:strict complexity-budget honesty lock was delivered by R4 (`complexity-budget-lock.js` / `auditComplexityBudgetLock` / verify 3g9). R6 MUST NOT reimplement or duplicate that lock module.

#### Scenario: OpenSpec states CLOSED_BY_R4

- GIVEN `openspec/changes/eos-r6-complexity-budget-verify-closeout/`
- WHEN operators read proposal/design/spec
- THEN K6 is marked CLOSED_BY_R4 and residual scope is CI + meta-tests + NON-CLAIM evidence

### Requirement: verify-eos keeps R4 lock wire

`scripts/verify-eos.js` MUST continue to import and invoke `auditComplexityBudgetLock` from `scripts/lib/complexity-budget-lock.js`.

#### Scenario: Import and wire present

- GIVEN the repository after R6
- WHEN `test:r6` inspects verify-eos source
- THEN it contains `complexity-budget-lock` and `auditComplexityBudgetLock`

### Requirement: CI seam-pack runs Ladder6 R locks

seam-pack MUST run CI-safe `test:r4` and `test:r5` so Ladder 6 locks cannot regress without CI signal (mirror R2/Q2).

#### Scenario: ci.yml includes r4 and r5

- GIVEN `.github/workflows/ci.yml` seam-pack job
- WHEN inspected by assert-gha-contract / m5 / r6 tests
- THEN both `test:r4` and `test:r5` appear; Fundacion freeze kept; no soak; no continue-on-error

### Requirement: Contract surfaces updated

`docs/governance/CI_CD_CONTRACT.md` and `scripts/ci/assert-gha-contract.js` MUST list `test:r4` and `test:r5`.

#### Scenario: Contract note R6

- GIVEN CI_CD_CONTRACT.md
- WHEN operators read the seam-pack row / R6 note
- THEN test:r4 and test:r5 are documented

### Requirement: NON-CLAIM candado ≠ prune

R6 evidence MUST restate NON-CLAIM: complexity-budget candado ≠ executed prune / P6 quarantine; PRODUCTION_READY=NO; Fundacion Δ=0.

#### Scenario: Evidence NON-CLAIM

- GIVEN `docs/releases/EOS_R6_COMPLEXITY_BUDGET_VERIFY_CLOSEOUT_2026-09-09.md`
- WHEN `test:r6` reads NON-CLAIM section
- THEN it asserts candado ≠ prune (and related needles)
