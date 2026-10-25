# OPENSPEC BASE SPECIFICATION: COGNITIVE EVALUATION & SAST (SPEC-008)

## 1. Scope
Governs 5-dimensional cognitive evaluation of code and design proposals: Hallucination Risk, EARS/BDD Conformance, Hexagonal Purity, Security SAST, and AST Syntax.

## 2. Requirements (EARS)
- **UBIQUITOUS**: THE SYSTEM SHALL evaluate code inputs across all 5 dimensions producing a composite quality score between 0.00 and 1.00.
- **ERROR/UNWANTED**: IF an input contains hardcoded API keys, secrets, or framework bleeding into domain layers, THEN THE SYSTEM SHALL penalize the score and output blocking security findings.
- **UBIQUITOUS**: THE SYSTEM SHALL generate a cryptographic Merkle receipt for every formal evaluation.
