# Proposal — SpecBoot S14 Mutation Testing Audit Harness (SPEC-0120)

## Problem Statement

Traditional code coverage (line, branch, and statement metrics) is a known vanity indicator in software engineering. A test suite can achieve 100% line coverage without verifying actual behavioral contracts if assertions are weak or absent. In autonomous agent architectures, AI coding agents may generate syntactically valid tests that execute paths but fail to detect logic inversions or domain bugs.

## Proposed Solution

Incorporate mathematical Mutation Testing into the SpecBoot execution lifecycle (S14 Mutation Audit) inspired by Gentleman Programming and LIDR Academy testing craftsmanship principles:
1. Provide a pure Layer-0 `MutationTestingHarness` that injects 8 deterministic mutator families (`InvertBoolean`, `InvertEquality`, `MathAddition`, `MathSubtraction`, `LogicalAnd`, `LogicalOr`).
2. Integrate `MutationTestingHarness` directly into `SpecbootAgentRunner.runVerify`: when `targetFiles` are specified, the runner evaluates mutation resilience on each file against its test suite.
3. Fail-closed invariant: If any mutant survives, the runner immediately halts the SpecBoot cycle and throws `SPECBOOT_MUTATION_AUDIT_FAILED`.
4. Ensure child test process hermetic isolation by stripping `NODE_TEST_CONTEXT` and `NODE_TEST_WORKER_ID` to prevent IPC deadlocks when executed within parent test runners.
5. Provide a standalone CI custody gate `scripts/ci/mutation-harness-gate.js`.

## Scope & Invariants

- PRODUCTION_READY: NO
- Fundacion Δ: 0
- Schemas JSON: AT_CEILING (35/35, zero new schemas)
- Law VI: Zero secret leakage
- Law VII: Standard professional English documentation and code artifacts
