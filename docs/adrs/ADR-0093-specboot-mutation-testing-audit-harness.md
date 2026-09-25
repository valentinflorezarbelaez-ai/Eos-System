# ADR-0093 — SpecBoot S14 Mathematical Mutation Testing Audit Harness

- **Status:** Accepted — local governed
- **Date:** 2026-09-24
- **Deciders:** EOS local governed use (SpecBoot Autonomous Execution & SDD Quality Fabric)
- **Spec:** SPEC-0120
- **Prior ADR:** ADR-0092 (Mission DJ Ladder 30 Seam-Pack Consolidation & Closeout)

## Context

Standard code coverage metrics (lines, branches, functions) can be misleading: an automated agent can easily produce tests that execute 100% of statements without performing meaningful assertions, giving a false sense of security.

In high-reliability enterprise engineering practices (championed by Gentleman Programming and LIDR Academy), **Mutation Testing** is the gold standard for verifying test suite effectiveness. By injecting synthetic bugs (mutants) into source code, the system mathematically proves that test assertions actually guard against real logic faults. If a mutant survives, the test suite is proven brittle or superficial, and the code change must be rejected.

## Decision

1. **Implement Pure Layer-0 MutationTestingHarness (`src/core/sdd/mutation-testing-harness.js`)**:
   - Injects 8 deterministic mutator families (`InvertBoolean`, `InvertEquality`, `MathAddition`, `MathSubtraction`, `LogicalAnd`, `LogicalOr`).
   - Restores original code content hermetically in a `finally` block.
   - Automatically resolves matching test files across adjacent directories or `tests/` directories.
   - Strips `NODE_TEST_CONTEXT` and `NODE_TEST_WORKER_ID` from subprocess environments to isolate child test executions from parent runner IPC channels.

2. **Integrate S14 Mutation Audit into `SpecbootAgentRunner` (`src/core/specboot/specboot-agent-runner.js`)**:
   - Registers error code `SPECBOOT_MUTATION_AUDIT_FAILED`.
   - In `runVerify`, when `targetFiles` or `mutationAudit: true` is configured, automatically executes `MutationTestingHarness.evaluateResilience` on all declared target files.
   - Fail-closed: If any mutant survives (`survivedMutants > 0`), the runner immediately halts the cycle and throws `SPECBOOT_MUTATION_AUDIT_FAILED`.

3. **Standalone CI Custody Gate (`scripts/ci/mutation-harness-gate.js`)**:
   - Provides deterministic verification that weak tests fail-closed and robust tests pass.

4. **Host Registration & Isolation**:
   - Registered `test:mutation-harness` and `gate:mutation-harness` in `package.json`.
   - Maintained isolation via `SLIM_SUITE_EXCLUDES` in `scripts/test-runner.js`.

## Alternatives REJECTED

- Integrating external heavy npm mutation frameworks (e.g. Stryker) — REJECTED: introduces heavy third-party dependencies, violating the Layer-0 runtime purity doctrine.
- Relying exclusively on line/branch coverage — REJECTED: vanity metrics permit tests without rigorous behavioral assertions.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED: strict non-claim; requires human PO authority and production deployment audit.

## Consequences

- Positive: Mathematical guarantee that tests generated or audited under SpecBoot actively fail when domain logic is corrupted.
- Invariants: `PRODUCTION_READY=NO`; `Fundacion Δ=0`; schemas `AT_CEILING 35/35`.

## NON-CLAIMS

- Mutation Audit Harness ≠ PRODUCTION_READY flip ≠ Fundacion Δ>0 ≠ GHE/GHA green claim.
