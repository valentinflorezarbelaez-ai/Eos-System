# Loop Engineering 4Q (S3 delta)

Capability: canonical Loop Engineering cycle + 4Q matrix mapped to EOS surfaces + verify:strict existence lock + doctor/mission honesty NON-CLAIM.

## Requirements

### Requirement: OpenSpec change exists

The repository SHALL contain `openspec/changes/eos-s3-loop-engineering-4q/` with proposal, design, tasks, and this delta spec before implementation lands.

#### Scenario: OpenSpec artifacts present

- GIVEN branch `cursor/eos-s3-loop-engineering-4q`
- WHEN operators list the change folder
- THEN `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, and `specs/loop-engineering-4q/spec.md` exist

### Requirement: Canonical Loop Engineering SSOT + ADR

EOS SHALL publish `docs/harness/LOOP_ENGINEERING_4Q.md` with guides→act→sensors→feedback cycle and a 4Q matrix (feedforward/feedback × computational/inferential) mapping **existing** EOS surfaces, plus ADR-0017 that points to that SSOT without rewriting ADR-0011 or ADR-0014.

#### Scenario: Required sections present

- GIVEN `docs/harness/LOOP_ENGINEERING_4Q.md`
- WHEN `auditLoopEngineeringLock` reads the file
- THEN it contains cycle headings/needles (guides, act, sensors, feedback), four quadrant labels, NON-CLAIM, PRODUCTION_READY: NO, and pointers to ADR-0014 / ADR-0017

#### Scenario: Quadrants map real surfaces

- GIVEN the matrix
- WHEN inspected
- THEN Feedforward Computational cites AGENTS/CLAUDE/.cursor/rules/hooks pre/linters/Write Barrier; Feedforward Inferential cites plan/OpenSpec/doctor OBSERVED; Feedback Computational cites verify:strict/CI/TDD/hooks post/locks; Feedback Inferential cites adversarial-review/fusion-light/HITL

### Requirement: verify:strict existence lock

`scripts/lib/loop-engineering-lock.js` SHALL provide `auditLoopEngineeringLock` fail-closed on missing index or required needles, wired into `scripts/verify-eos.js` under strict mode (mirror context-pack-lock).

#### Scenario: Real index passes

- GIVEN the repository index
- WHEN `auditLoopEngineeringLock(rootDir)` runs
- THEN `ok === true`

#### Scenario: Missing or stripped index fails closed

- GIVEN `docMissing: true` or stripped section fixtures
- WHEN `auditLoopEngineeringLock` runs
- THEN `ok === false` with typed failures

### Requirement: TDD surface test:s3

`package.json` SHALL expose `test:s3` running `tests/eos-s3-loop-engineering-4q.test.js`.

#### Scenario: test:s3 script

- GIVEN package.json scripts
- WHEN inspected by the S3 test
- THEN `test:s3` equals `node --test tests/eos-s3-loop-engineering-4q.test.js`

### Requirement: NON-CLAIM policy ≠ productive autonomy; Loop ≠ verify; doctor ≠ verify

Evidence, harness index, and doctor honesty MUST state NON-CLAIM that Loop Engineering policy is **not** productive autonomy and **not** verify:strict; doctor remains OBSERVED ≠ verify; PRODUCTION_READY remains NO; Fundacion Δ=0; no new docs/schemas JSON while AT_CEILING.

#### Scenario: Evidence NON-CLAIM

- GIVEN `docs/releases/EOS_S3_LOOP_ENGINEERING_4Q_2026-09-09.md`
- WHEN `test:s3` reads NON-CLAIM / PRODUCTION_READY
- THEN needles assert policy ≠ productive autonomy (or equivalent), Loop ≠ verify:strict, and PRODUCTION_READY=NO
