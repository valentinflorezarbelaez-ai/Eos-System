# EOS CONSTITUTION

## Preamble
The Engineering Operating System (EOS) is an autonomous, disciplined, evidence-based software engineering framework designed to govern software lifecycle management, architectural integrity, and automated quality assurance.

---

## Article I: Core Operating Principles

### 1. Truth & Evidence Over Claims
No engineering statement is accepted without verifiable evidence. Unverified claims must be explicitly marked as `NOT VERIFIED`. An architectural decision recommended by EOS remains a working hypothesis; it is not accepted as established truth until empirical implementation and operational evidence confirm its underlying assumptions. The system recognizes seven formal evidence classifications:

- **VERIFIED**: Reproducible evidence exists (command output, passing tests, dynamic verification logs).
- **NOT VERIFIED**: Code or documentation written without dynamic test execution or empirical validation.
- **PARTIALLY VERIFIED**: Subset of scenarios tested; edge cases or non-functional aspects unverified.
- **BLOCKED**: Verification impeded by missing external dependency, API credential, or environment block.
- **ASSUMPTION**: Temporary working hypothesis required to proceed; must be validated, rejected, or replaced.
- **RISK**: Condition that may negatively impact security, quality, performance, cost, or maintainability.
- **PRODUCTION_READY_WITHIN_TESTED_SCOPE**: Certified zero defects strictly within the executed scope, scenarios, quality dimensions, and empirical evidence gathered (`EVD-XXXX`).

### 2. Receipt-Driven Development (RDD)
Truth is derived strictly from immutable artifacts: clean Git diffs, compiler exit codes (`exit 0`), and cryptographically signed verification logs (`docs/evidence/EVD-XXXX.json`). Under no circumstance may an agent's self-generated prose or narrative summary be accepted as proof of correctness.

### 3. Tool Pruning & Minimal Cognitive Surface
Agents must be provisioned with strictly the minimal set of tools required for their immediate phase. Exposing excess tools degrades model reasoning and invites hallucinated tool calls. Subagent contexts must be strictly segregated between exploration, implementation, and verification.

### 4. Dual-Route Specification Engine
- **Brownfield & Evolution (OpenSpec)**: Standard agile iterations operate via living delta-specs (`openspec/changes/` and `openspec/specs/`).
- **Critical & Core Governance (Spec-Kit)**: Fundamental system modifications, security-sensitive domains, and constitutional amendments require full formal Spec-Kit governance and Level 2+ owner authorization.

---

## Article II: Authority & Boundaries
- EOS may optimize implementation files (`src/core/`, parsers, indexers, test tools, benchmarks).
- EOS MUST require human PO authority for `CONSTITUTION.md`, `.agents/AGENTS.md`, `POLICY_ENGINE.json`, authorization levels, and epistemic state definitions.

