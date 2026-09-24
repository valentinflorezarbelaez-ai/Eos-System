# Tasks — SpecBoot S14 Mutation Testing Audit Harness

- [x] Pure Layer-0 MutationTestingHarness implementation (`src/core/sdd/mutation-testing-harness.js`)
- [x] S14 gate integration in SpecbootAgentRunner (`src/core/specboot/specboot-agent-runner.js`)
- [x] Cross-platform test execution and IPC env stripping (`NODE_TEST_CONTEXT` / `NODE_TEST_WORKER_ID`)
- [x] Integration test suite (`tests/specboot/mutation-audit-integration.test.js`)
- [x] CI Custody Gate (`scripts/ci/mutation-harness-gate.js`)
- [x] Host package.json scripts (`test:mutation-harness`, `gate:mutation-harness`)
- [x] Test runner isolation in SLIM_SUITE_EXCLUDES
- [x] ADR-0093 + evidence report
