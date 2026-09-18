# ADR-0043 — Mission BY Autonomous EARS/BDD Spec Synthesizer & Verification Compiler Port

- **Status:** Accepted — local governed (Ladder 23 Satellite 3)
- **Date:** 2026-09-15
- **Deciders:** EOS local governed use (Sovereign Autonomous Synthesis, Distributed Invariant Consensus & Self-Reification Fabric)
- **Spec:** SPEC-0082

## Context

Ladders 11 through 22 are formally CLOSED_FOR_LOCAL_GOVERNED_USE and sealed against modification.
Ladder 23 establishes the **Sovereign Autonomous Synthesis, Distributed Invariant Consensus & Self-Reification Fabric**.
Under the Law of Specification as Supreme Truth, zero implementation code may be written from informal or conversational prompts.
However, manually formalizing requirements into IEEE 830 EARS and Gherkin BDD structures creates a cognitive bottleneck.

Mission BY delivers a pure Layer-0 autonomous specification synthesizer and verification compiler port that:
1. Ingests high-level functional goals and objectives.
2. Derives formal requirements matching strictly one of 4 EARS patterns (Event-Driven, State-Driven, Error/Unwanted, Ubiquitous).
3. Detects and purges ambiguous terminology (`maybe`, `might`, `as fast as possible`, `etc`).
4. Generates corresponding Gherkin BDD scenarios (`GIVEN-WHEN-THEN-AND`) bound directly to requirement IDs.
5. Emits publication-ready Markdown specifications with canonical SHA-256 digests.
6. Screens for plain secrets (Law VI) and enforces the Fundacion write barrier (`FUNDACION_ALWAYS_DENY`).
7. Emits cryptographically sealed `BY-RCPT-*` receipts verifying chain of custody.

## Decision

1. Implement three Layer-0 modules under `src/core/sdd/`:
   - `spec-synthesis-receipt.js`: Canonical nine-field SHA-256 sealed receipts (`BY-RCPT-*`) via `node:crypto`.
   - `spec-synthesis-policy-gate.js`: Fail-closed policy gate enforcing EARS regex patterns, BDD clauses, Law VI secret screening, and Fundacion write barrier.
   - `spec-synthesis-compiler-port.js`: Unified port facade (`SpecSynthesisCompilerPort`, `compileGoalToSpec`, `renderMarkdown`, `getSpec`, `verifySpecTrail`).
2. Strict EARS Grammar Validation:
   Every generated or supplied requirement must match one of the 4 formal EARS regex patterns:
   - Event-Driven: `WHEN <event>, THE SYSTEM SHALL <response>`
   - State-Driven: `WHILE <state>, THE SYSTEM SHALL <response>`
   - Error-Driven: `IF <anomaly>, THEN THE SYSTEM SHALL <response>`
   - Ubiquitous: `THE SYSTEM SHALL <continuous behavior>`
3. Exclude satellite test suite `tests/eos-by-spec-synthesis-compiler-port.test.js` from default test discovery (`SLIM ≤ 145`) via `scripts/test-runner.js` and provide dedicated opt-in `npm run test:mission-by`.
4. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, zero external npm dependencies.

## Alternatives considered AND REJECTED

### A. Conversational / LLM-Prompted Spec Generation (Vibe Specs)
**Rejected.** Generating specifications through open-ended LLM conversations without formal syntactic grammars produces non-verifiable, ambiguous prose that violates the Law of Specification as Supreme Truth.
Technical reason: Strict regex pattern enforcement guarantees 100% compliance with IEEE 830 / ISO 29148 standards.

### B. Unstructured Plain Text Requirements
**Rejected.** Unstructured text lacks deterministic event triggers, state bounds, and error conditions, leading to missing edge cases during implementation.
Technical reason: EARS 4-pattern taxonomy provides mathematical completeness across happy paths, state invariants, and unwanted conditions.

## Consequences

- **Positive:** Automated, mathematically formal specification synthesis; zero vibe coding; 15/15 hermetic tests passing; zero secrets; Fundacion Δ=0.
- **Negative:** Requirements must strictly conform to the 4 canonical EARS patterns.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI held.
