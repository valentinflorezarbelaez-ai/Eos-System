# INTAKE-001: EOS 2.0 ARCHITECTURAL SYNTHESIS
## Context, Triangulated Critiques, and Engineering Objectives

---

### 1. Business & Context Background
Software development with AI models in 2026 has fractured into two dysfunctional extremes:
* **Failure Mode A (The Vibe Coder Trap - Víctor Robles critique):**
  Unstructured, multi-turn prompting generating unverified code directly into production. Lacks type safety, data contracts, and unit tests. Results in catastrophic regressions and architectural collapse as codebase complexity scales.
* **Failure Mode B (The SDD Paralysis Trap - HolaMundo critique):**
  Hyper-bureaucratic, inflexible Spec-Driven Development that mimics old-school Waterfall. Imposes immense upfront friction, where specifications become obsolete before code is even written, halting team velocity.
* **The Solution (The Linus Torvalds Kernel Doctrine - midudev summary):**
  Ruthless code simplicity ("good taste"), verifiable automated test suites, maintainer ergonomics, and deterministic evidence (compilation with zero warnings, exit code 0, SHA-256 integrity proofs).

---

### 2. Functional & Architecture Objectives
1. **Zero Vibe Coding:** Domain logic must be pure TypeScript/modern architecture, adhering to Clean/Hexagonal principles with explicit data schemas.
2. **Dual-Track Execution Engine:**
   - Fast-Track: Lean TDD loop for localized, low-risk changes.
   - Heavy-Track: Formal EARS/BDD specifications, ADRs, and DAG tasks for architectural, domain, or high-risk changes.
3. **Automated Cryptographic Evidence Ledger:**
   - Every verification must produce machine-readable JSON logs with SHA-256 hashes, timestamps, and zero open findings.
4. **Autonomous Self-Healing (FDIR):**
   - The Sentinel daemon monitors control-plane integrity.
   - The FDIROntology module detects and isolates orphan relational links.
