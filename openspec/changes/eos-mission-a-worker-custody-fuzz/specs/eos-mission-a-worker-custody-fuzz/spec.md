# Spec — Mission A Worker + Custody Adversarial Fuzz (SPEC-0008-FUZZ)

## Requirement

EOS MUST keep the SPEC-0008 headless compute worker and V5 builder/verifier custody **fail-closed** under adversarial fuzz inputs:

1. `parseCheckboxTasks` MUST tolerate malformed markdown and unclosed checkboxes without inventing phantom tasks; MUST handle unicode task text; MUST **reject** task texts that embed path-traversal or null-byte path fragments (no filesystem escape).
2. `assertBuilderVerifierDisjunction` MUST reject identical builder/verifier identities and spoofed same-token pairs (including invisible/format-character collisions) fail-closed.
3. On verifier-child failure after apply, `executeComputeRun` MUST invoke rollback such that the working tree / simulated tree has **no dirty residuals** from the worker run.
4. MUST NOT weaken the V5 production custody invariant, flip `PRODUCTION_READY`, mutate Fundacion, add package.json dependencies, or exceed AT_CEILING.

## Scenario — checkbox fuzz fail-closed

GIVEN malformed lines, unclosed `[`, and unicode checkbox text
WHEN `parseCheckboxTasks` runs
THEN only well-formed `- [ ]` / `- [x]` lines become tasks
AND traversal/null-byte path fragments in task text are rejected fail-closed

## Scenario — custody spoof fail-closed

GIVEN builder_id and verifier_id that are identical or the same token after stripping format/zero-width characters
WHEN `assertBuilderVerifierDisjunction` runs
THEN it throws `BUILDER_EQUALS_VERIFIER_VIOLATION` (fail-closed)

## Scenario — rollback leaves clean tree

GIVEN applyDiff dirties a simulated working tree
AND verifier child returns failure
WHEN `executeComputeRun` completes
THEN status is `ROLLED_BACK`
AND the simulated tree matches the pre-apply snapshot (no dirty residuals)
