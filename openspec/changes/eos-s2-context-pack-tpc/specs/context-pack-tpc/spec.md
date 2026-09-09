# Context Pack TPC (S2 delta)

Capability: canonical Context Pack TPC index + lifecycle policy notes + verify:strict existence lock.

## Requirements

### Requirement: OpenSpec change exists

The repository SHALL contain `openspec/changes/eos-s2-context-pack-tpc/` with proposal, design, tasks, and this delta spec before implementation lands.

#### Scenario: OpenSpec artifacts present

- GIVEN branch `cursor/eos-s2-context-pack-tpc`
- WHEN operators list the change folder
- THEN `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, and `specs/context-pack-tpc/spec.md` exist

### Requirement: Canonical TPC index SSOT

EOS SHALL publish a single SSOT index at `docs/harness/CONTEXT_PACK_TPC.md` with Tool, Prompt, and Context pillars pointing at existing surfaces, plus context lifecycle policy text and a pointer to the LIDR adoption doc.

#### Scenario: Required sections present

- GIVEN `docs/harness/CONTEXT_PACK_TPC.md`
- WHEN `auditContextPackLock` reads the file
- THEN it contains Tool / Prompt / Context pillar headings, lifecycle verbs (inject, compact, discard, reset, revisit-on-model-change), NON-CLAIM, PRODUCTION_READY: NO, and a LIDR adoption pointer

#### Scenario: Spec-Boot gaps are DEFER not invented

- GIVEN the index
- WHEN missing Spec-Boot files are referenced
- THEN `frontend-standards`, `documentation-standards`, and `development_guide` are marked DEFER/MISSING with proxies — without inventing full standards bodies

### Requirement: verify:strict existence lock

`scripts/lib/context-pack-lock.js` SHALL provide `auditContextPackLock` fail-closed on missing index or required needles, wired into `scripts/verify-eos.js` under strict mode (mirror p6-inventory-lock).

#### Scenario: Real index passes

- GIVEN the repository index
- WHEN `auditContextPackLock(rootDir)` runs
- THEN `ok === true`

#### Scenario: Missing or stripped index fails closed

- GIVEN `docMissing: true` or stripped section fixtures
- WHEN `auditContextPackLock` runs
- THEN `ok === false` with typed failures

### Requirement: TDD surface test:s2

`package.json` SHALL expose `test:s2` running `tests/eos-s2-context-pack-tpc.test.js`.

#### Scenario: test:s2 script

- GIVEN package.json scripts
- WHEN inspected by the S2 test
- THEN `test:s2` equals `node --test tests/eos-s2-context-pack-tpc.test.js`

### Requirement: NON-CLAIM index ≠ runtime context completo

Evidence and index MUST state NON-CLAIM that the Context Pack index is **not** a full runtime context engineering orchestrator; PRODUCTION_READY remains NO; Fundacion Δ=0; no new docs/schemas JSON while AT_CEILING.

#### Scenario: Evidence NON-CLAIM

- GIVEN `docs/releases/EOS_S2_CONTEXT_PACK_TPC_2026-09-09.md`
- WHEN `test:s2` reads NON-CLAIM / PRODUCTION_READY
- THEN needles assert index ≠ runtime context completo (or equivalent) and PRODUCTION_READY=NO
