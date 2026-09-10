# SpecBoot cycle + Antigravity-first (delta)

Capability: harness SSOT for SpecBoot LIDR cycle + Antigravity-first runtime policy + AGY skill mirrors + verify lock.

## Requirements

### Requirement: OpenSpec change exists

The repository SHALL contain `openspec/changes/eos-specboot-antigravity-first/` with proposal, design, tasks, and this delta spec.

#### Scenario: OpenSpec artifacts present

- GIVEN branch `cursor/eos-specboot-antigravity-first`
- WHEN operators list the change folder
- THEN `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, and `specs/specboot-antigravity-first/spec.md` exist

### Requirement: SpecBoot cycle SSOT

EOS SHALL publish `docs/harness/SPECBOOT_CYCLE.md` with the USER STORY → enrich-us → propose/ff → apply → verify + adversarial-review → archive + commit → publish cycle, an EOS skill/command coverage map, and PRODUCTION_READY: NO.

#### Scenario: Required cycle needles

- GIVEN `docs/harness/SPECBOOT_CYCLE.md`
- WHEN `auditSpecbootCycleLock` reads the file
- THEN it contains enrich-us, propose, apply, verify, adversarial-review, archive, commit, Antigravity-first, and PRODUCTION_READY: NO

### Requirement: Antigravity-first policy

EOS SHALL publish `docs/harness/ANTIGRAVITY_FIRST.md` declaring Antigravity/Gemini/eos-workstation as primary runtime, Cursor CloudAgent out of the default SpecBoot path, links to daemon ops + fusion ground truth, and NON-CLAIM that local Cursor IDE file editing is not banned.

#### Scenario: CloudAgent demoted, IDE editing allowed

- GIVEN `docs/harness/ANTIGRAVITY_FIRST.md`
- WHEN inspected by lock/tests
- THEN it states Antigravity-first, CloudAgent out of default path, NON-CLAIM not banning local Cursor IDE editing, and PRODUCTION_READY: NO

### Requirement: AGY skill mirrors without body fork

`.agents/skills` SHALL expose `ff`, `propose`, `apply`, `verify`, `archive`, and `commit` via thin `SKILL.md` pointers to `.cursor/commands/<step>.md` (and ai-specs commit for commit). Bodies SHALL NOT be wholesale duplicated.

#### Scenario: Skill paths exist and point to command SSOT

- GIVEN the repository
- WHEN tests scan `.agents/skills/<step>/SKILL.md`
- THEN each file exists and mentions the corresponding `.cursor/commands/<step>.md` path

### Requirement: verify:strict lock

`scripts/lib/specboot-cycle-lock.js` SHALL provide `auditSpecbootCycleLock` fail-closed, wired into `scripts/verify-eos.js` strict mode.

#### Scenario: Real docs pass

- GIVEN repository docs + skills
- WHEN `auditSpecbootCycleLock(rootDir)` runs
- THEN `ok === true`

### Requirement: Named test script

`package.json` SHALL expose `test:specboot-agy` running the SpecBoot Antigravity-first test file.

#### Scenario: npm script

- GIVEN package.json scripts
- WHEN inspected
- THEN `test:specboot-agy` equals `node --test tests/eos-specboot-antigravity-first.test.js`
