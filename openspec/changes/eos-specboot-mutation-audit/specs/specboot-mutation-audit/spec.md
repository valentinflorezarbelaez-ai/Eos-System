# Spec — SpecBoot S14 Mutation Testing Audit Harness (SPEC-0120)

## Purpose

Establishes mathematical proof of test suite resilience within the SpecBoot autonomous execution cycle.

## Requirements

### Requirement: Deterministic Mutation Injection

The system MUST provide a `MutationTestingHarness` that:
- SHALL support 8 deterministic mutator families covering boolean, equality, math, and logical operators.
- SHALL sequentially mutate source files in-place and guarantee restoration in a `finally` block.
- SHALL execute covering tests in a hermetic child process with `NODE_TEST_CONTEXT` stripped.
- SHALL compute `mutationScore` as `(killedMutants / totalMutants) * 100`.

### Requirement: SpecBoot Runner S14 Gate Integration

The `SpecbootAgentRunner` MUST:
- SHALL export error code `SPECBOOT_MUTATION_AUDIT_FAILED`.
- SHALL execute mutation testing during `runVerify` whenever `targetFiles` or `mutationAudit: true` is configured.
- SHALL throw `SPECBOOT_MUTATION_AUDIT_FAILED` and halt the cycle if any mutant survives (`survivedMutants > 0`).
- SHALL proceed to `ARCHIVE` and `COMMIT_READY` only when all mutants are killed.

### Requirement: Governance Invariants

- SHALL maintain `PRODUCTION_READY: NO`.
- SHALL maintain `Fundacion Δ = 0`.
- SHALL maintain schemas ceiling `AT_CEILING 35/35`.
- SHALL keep test suites excluded from default slim discovery via `SLIM_SUITE_EXCLUDES`.
