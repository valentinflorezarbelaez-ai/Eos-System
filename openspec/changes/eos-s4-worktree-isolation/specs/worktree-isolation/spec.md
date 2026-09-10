# Worktree isolation (S4 delta)

Capability: canonical worktree isolation policy + CI-safe smoke/named test + Spec-Boot `using-git-worktrees` map without fork + verify:strict existence lock + NON-CLAIM no swarm.

## Requirements

### Requirement: OpenSpec change exists

The repository SHALL contain `openspec/changes/eos-s4-worktree-isolation/` with proposal, design, tasks, and this delta spec before implementation lands.

#### Scenario: OpenSpec artifacts present

- GIVEN branch `cursor/eos-s4-worktree-isolation`
- WHEN operators list the change folder
- THEN `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, and `specs/worktree-isolation/spec.md` exist

### Requirement: Canonical worktree isolation policy SSOT

EOS SHALL publish `docs/harness/WORKTREE_ISOLATION_POLICY.md` stating one agent/session ≠ shared dirty dir, Spec-Boot skill map (cite paths; no fork), limits (.env / node_modules / DB / ports), CI-safe smoke rules, and NON-CLAIM no swarm, with PRODUCTION_READY: NO.

#### Scenario: Required sections present

- GIVEN `docs/harness/WORKTREE_ISOLATION_POLICY.md`
- WHEN `auditWorktreePolicyLock` reads the file
- THEN it contains isolation rule, Spec-Boot map, limits, CI-safe smoke, NON-CLAIM, PRODUCTION_READY: NO, and pointers to skill paths + `bin/eos-worktree.js`

### Requirement: Spec-Boot map without fork

Policy SHALL cite `.agents/skills/using-git-worktrees/SKILL.md` and `ai-specs/skills/using-git-worktrees/SKILL.md` and SHALL NOT duplicate the full Spec-Boot skill body as a forked skill.

#### Scenario: Skill paths exist and are cited

- GIVEN the repository
- WHEN S4 tests and lock run
- THEN both skill paths exist on disk and the policy document mentions `using-git-worktrees` and both path strings

### Requirement: verify:strict existence lock

`scripts/lib/worktree-policy-lock.js` SHALL provide `auditWorktreePolicyLock` fail-closed on missing policy or required needles/paths, wired into `scripts/verify-eos.js` under strict mode (mirror loop-engineering-lock).

#### Scenario: Real policy passes

- GIVEN the repository policy
- WHEN `auditWorktreePolicyLock(rootDir)` runs
- THEN `ok === true`

#### Scenario: Missing or stripped policy fails closed

- GIVEN `docMissing: true` or stripped section fixtures
- WHEN `auditWorktreePolicyLock` runs
- THEN `ok === false` with typed failures

### Requirement: CI-safe smoke test:s4

`package.json` SHALL expose `test:s4` running `tests/eos-s4-worktree-isolation.test.js`. The named smoke SHALL NOT create or remove real git worktrees. Allowed checks: OpenSpec presence, lock audit, policy needles, CLI `--help` / invalid taskId, required path existence.

#### Scenario: test:s4 script

- GIVEN package.json scripts
- WHEN inspected by the S4 test
- THEN `test:s4` equals `node --test tests/eos-s4-worktree-isolation.test.js`

#### Scenario: No worktree churn in named smoke

- GIVEN `tests/eos-s4-worktree-isolation.test.js` source
- WHEN scanned
- THEN it does not call `worktree add`, `worktree remove`, `manager.create(`, or `manager.cleanup(` for real lifecycle churn

### Requirement: NON-CLAIM no swarm; PRODUCTION_READY=NO

Policy and evidence SHALL state NON-CLAIM no swarm (policy ≠ swarm orchestration) and PRODUCTION_READY: NO; Fundacion Delta=0; no new schemas JSON.

#### Scenario: Honesty language present

- GIVEN policy + Spanish evidence
- WHEN inspected
- THEN NON-CLAIM / no swarm / PRODUCTION_READY NO language is present and Fundacion Delta=0 is stated
