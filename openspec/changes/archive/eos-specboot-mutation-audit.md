# Archive note — eos-specboot-mutation-audit

Archived: 2026-09-24

Delta merged into `openspec/specs/specboot-mutation-audit/spec.md`.
Change folder retained at `openspec/changes/eos-specboot-mutation-audit/`.

All deliverables executed with 100% strict TDD:
- Layer-0 MutationTestingHarness: `src/core/sdd/mutation-testing-harness.js` (8 mutator families, cross-platform path resolution, test runner IPC env stripping).
- SpecBoot integration: `src/core/specboot/specboot-agent-runner.js` (S14 Mutation Audit in runVerify, `SPECBOOT_MUTATION_AUDIT_FAILED`).
- Standalone gate: `scripts/ci/mutation-harness-gate.js` (`gate:mutation-harness`).
- Test suite: `tests/specboot/mutation-audit-integration.test.js` (S14.0, S14.1, S14.2 passing).
- Package scripts: `test:mutation-harness` and `gate:mutation-harness` registered in `package.json`.
- ADR-0093, evidence report, and spec fold completed.

Deterministic Evidence:
- `npm run test:mutation-harness`: 3/3 passing tests.
- `npm run gate:mutation-harness`: 100% pass (0 failures).
- `node --test tests/specboot/specboot-agent-runner.test.js`: 12/12 passing tests (1 skipped soak).
- `npm run verify:strict`: 914/914 green checks (0 failures).

Official OpenSpec CLI (`openspec archive`) was **not** run: binary not on PATH. That is `BLOCKED`, not faked.

Archive is not a release. Merge to `main` remains human / HITL / write-barrier.
