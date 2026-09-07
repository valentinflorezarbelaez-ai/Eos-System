# EOS Workspace Agents Rules & Protocol

This document establishes the governing operational rules for all AI agents operating within the EOS workspace.

## Core Operational Directives

### 1. Autonomous Execution Contract
- Agents operate autonomously under the **Decide → Execute → Verify → Document → Continue** pipeline.
- Do not stop for routine approvals (file creation, package installation, refactoring, lint fixes).
- Escalate to the human Product Owner **ONLY** for high-risk operations (data destruction, secret exposure, external production deployments, financial actions, fundamental spec changes).

### 2. Evidence Over Claims Standard & Taxonomy
No agent may state `DONE`, `PASS`, `VERIFIED`, `SECURE`, `OPTIMIZED`, or `PRODUCTION READY` without referencing executable evidence or automated check output.

**Epistemic Validation States (MANDATORY)**:
- `AUDIT_EXECUTED`: Tests/checks have run; raw results gathered.
- `FINDINGS_IDENTIFIED`: Bugs or regressions have been documented from the audit.
- `REMEDIATION_REQUIRED`: A plan to fix findings is needed.
- `REMEDIATION_IN_PROGRESS`: Fixes are currently being developed/applied.
- `REVALIDATION_REQUIRED`: Fixes applied, awaiting regression tests.
- `VERIFIED`: Evidence from code execution, builds, test passes, or automated checks confirms fixes worked.
- `PRODUCTION_READY_WITHIN_TESTED_SCOPE`: Zero open findings strictly within executed scenarios and recorded evidence.
- `PRODUCTION_READY`: Zero open findings across all required production quality dimensions.

**Evidence Confidence Levels**:
- **NOT VERIFIED**: Code written but unexecuted or untested; unverified hypotheses.
- **PARTIALLY VERIFIED**: Subset of scenarios tested; edge cases or non-functional aspects unverified.
- **BLOCKED**: Verification impeded by missing external dependency, API key, or environment block.
- **ASSUMPTION**: Temporary hypothesis required to proceed; must be tracked and validated or replaced.
- **RISK**: Identified condition that may negatively impact security, quality, performance, or maintainability.

### 3. Preservation & Proportionality
- **Preserve Before Modify**: Inspect dependencies and existing context before editing.
- **Proportionality**: Avoid unnecessary complexity. Prefer simple, readable, maintainable solutions over complex abstractions.

### 4. Language & Artifact Discipline
- **System & Technical Artifacts**: Written in standard professional English (code, comments, documentation, ADRs, commit messages, specs).
- **User Interface & Persona Communication**: Respects user language and interaction context.

### 5. Mandatory External Write Barrier & Autonomous Scope Limits
- **EOS Development Mode**: During Control Plane self-development or framework audits, writing to external target project directories (e.g., `C:\Users\valen\Documents\Fundacion`) is strictly **FORBIDDEN**.
- **External Write Preconditions**: Writing to an external project repository requires verified evidence of:
  1. `REGISTERED` status in `docs/projects/registry.json`.
  2. `INTAKE_COMPLETE` status in `docs/intake/`.
  3. `SPECIFICATION_APPROVED` status in `docs/specs/`.
  4. `AUDIT_COMPLETE` status in `docs/audits/`.
  5. `OWNER_APPROVAL` recorded in decision records.
  6. `IMPLEMENTATION_AUTHORIZED` status (`LEVEL 2` or higher) in `IMPLEMENTATION_AUTHORIZATION.md`.
- **Autonomy Boundaries**: `AUTONOMOUS` operational mode grants authority within authorized Control Plane scope. Autonomy does NOT permit modifying external code without an explicit `IMPLEMENTATION_AUTHORIZED` record or an approved `EXTERNAL_PROJECT_WRITE_EXCEPTION`.

### 6. Anti-Overengineering Gate (Ponytail Decision Ladder)
Every implementation proposal and code modification MUST be evaluated against the strict 5-tier Ponytail Decision Ladder before code is written:
1. **Tier 1 (Zero-Abstraction Language Primitives)**: Can this problem be solved using existing language/runtime built-in primitives and standard library functions without introducing any new abstractions? If yes, STOP and implement.
2. **Tier 2 (Single Pure Utility)**: If native primitives are insufficient, can a single pure, focused function solve it without introducing classes, stateful objects, or design patterns? If yes, implement a minimal utility.
3. **Tier 3 (Specification-Mandated Component)**: Does the approved specification or architectural design explicitly mandate a dedicated module or component boundary? If yes, implement strictly within defined contracts.
4. **Tier 4 (Dependency & Framework Justification)**: Does this introduce a third-party dependency, heavy library, or non-trivial architectural abstraction? If so, REJECT unless formally justified by an approved ADR or Product Owner sign-off.
5. **Tier 5 (Anti-YAGNI Rejection)**: Reject all speculative configurability, premature generic abstractions, theoretical future-proofing, and "just-in-case" extensibility points. Implement ONLY what the current specification requires.

### 7. Harness Engineering & Deterministic Pre-Merge Invariants
- **Automated Verification Over Manual Reading**:
  Manual line-by-line code review shifts cognitive bottlenecks without guaranteeing business logic correctness. No agent or human may propose merging code without green automated sensor suites (100% typecheck, zero lint warnings, regression test passes, security scan, integrity audits).
- **The Tripartite Pre-Merge Evaluation (Stripe/Vercel Standard)**:
  Before proposing a merge, the agent and operator must confirm three binary checks:
  1. *Spec Compliance*: Does the code implement precisely what the approved specification or task DAG specifies? (Yes/No)
  2. *Sensor Verification*: Did 100% of deterministic automated checks pass with concrete evidence? (Yes/No)
  3. *Scope Containment*: Did the change touch strictly the authorized paths and files without collateral creep? (Yes/No)
  If all three are YES, the change is merge-eligible. If any is NO, merge is BLOCKED.
- **Spec Defect vs Agent Defect**:
  If green tests pass in staging but business behavior is flawed, treat this as a **Specification / Test Gap Defect**, not an agent trust issue. Remediate by updating the formal specification and writing a failing regression test first.

### 8. Token & Context Hygiene Protocol
- **Static Context & Cache Anchoring**:
  Anchor core system prompt rules, unchanging schemas, and static architectural references at the head of execution contexts to maximize LLM prompt caching hit rates (>90% cache read vs cache write).
- **Observation Budget & Output Filtering**:
  Agents must never execute commands or inspections that flood context with unbounded raw terminal outputs, mass directory dumps, or uncompressed multi-megabyte payloads.
  - Shell commands must use targeted arguments (`--max-lines`, `--depth`, specific file paths).
  - Search tools must use targeted regex and glob filters rather than unbounded broad sweeps.
  - Large data files or verbose logs must be summarized or inspected in chunks rather than dumped in full into context.
- **Conciseness & Signal-to-Noise Ratio**:
  Chat responses addressed to the user default to short, direct, high-value answers. Technical explanations must focus on problem, technical reasoning, and verified evidence rather than verbose conversational filler.

## EOS 21-Step Engineering Pipeline

```text
INTAKE → RECONNAISSANCE → CONTEXT UNDERSTANDING → REQUIREMENTS → RESEARCH → 
ARCHITECTURE → DESIGN → IMPLEMENTATION → TESTING → SECURITY → QUALITY → 
ACCESSIBILITY → PERFORMANCE → SEO → BROWSER QA → EVIDENCE → DOCUMENTATION → 
DEPLOYMENT → POST-DEPLOYMENT VERIFICATION → LEARNING → CONTINUOUS IMPROVEMENT
```

