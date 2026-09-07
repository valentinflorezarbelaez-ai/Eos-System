# ADR-0011: Harness Engineering, Token Hygiene, and Anti-Overengineering Doctrine

* **Status:** Accepted
* **Date:** 2026-09-07
* **Author:** EOS Control Plane & Product Owner
* **Context & Ingestion:** Ingestion of LIDR Harness Engineering Research (`LIDR-HARNESS-ENGINEERING-202609.md`) and Deep Research on Token Reduction Tools (`token_savings_research.md`)
* **Extends:** ADR-0010 (LIDR Specboot + Gentleman Discipline Bridge), `docs/core/GOVERNANCE.md`, `.agents/AGENTS.md`
* **Does not amend:** `CONSTITUTION.md` (Constitutional invariants remain inviolable)

---

## 1. Context

Empirical studies on AI-assisted software engineering (METR 2025/2026, Faros AI 2025/2026 analyzing 22,000+ developers) demonstrate a severe **productivity paradox**:
- Developers perceive themselves as ~20% faster when using AI tools, yet rigorous empirical measurement shows they are ~19% slower without formal harnesses.
- Ungoverned AI code generation produces +54% bug rates, +242% incident rates per PR, and up to 5x increase in manual code review overhead.
- AI agents systematically exhibit two pathological failure modes:
  1. **Premature Overengineering**: Generating bloated class hierarchies, speculative abstraction layers, and unused configurability points ("just-in-case" engineering).
  2. **Context & Token Bloat**: Dumping excessive terminal output, reading unbounded files, and thrashing context windows, degrading model reasoning capability and exponentially inflating operational cost.

Furthermore, manual inspection of every line of agent-generated code shifts the bottleneck from writing code to reading code, nullifying velocity gains while failing to catch non-obvious business logic flaws.

Leading engineering organizations (e.g., Stripe merging 1,300+ agent-generated PRs weekly, Vercel v0 automated pipelines) resolve this through **Harness Engineering**: moving verification entirely into deterministic automated sensor suites and formal specifications before human review.

---

## 2. Decision

EOS formally adopts three deterministic pillars into its Control Plane governance:

### Pillar I: The Ponytail Anti-Overengineering Decision Ladder
Inspired by Dietrich Gebert's Ponytail doctrine, every code change proposed by an agent or human in EOS must strictly evaluate against the **5-Tier Decision Ladder** prior to code emission:

```text
Tier 1: Zero-Abstraction Language Primitives
  └─► If solvable with standard library / built-in syntax → STOP & IMPLEMENT.
Tier 2: Single Focused Pure Utility
  └─► If primitives insufficient → write a single pure function (zero state, zero classes).
Tier 3: Specification-Mandated Component
  └─► If module boundary required by formal spec/design → implement strictly within contracts.
Tier 4: Dependency / Heavy Abstraction Justification
  └─► If third-party package or design pattern needed → REJECT unless justified by an ADR.
Tier 5: Strict Anti-YAGNI Rejection
  └─► Reject speculative configurability, generic wrappers, and hypothetical extensibility.
```

### Pillar II: Deterministic Pre-Merge Sensor Suites (Harness Engineering)
1. **Automated Verification Over Manual Reading**:
   - Code review must never be an unassisted manual line-by-line proofread.
   - 100% of deterministic checks (static analysis, types, linting, unit tests, security scans, integrity audits) must run and pass in the execution harness before a PR or merge is evaluated.
2. **The Tripartite Review Standard**:
   A human Product Owner or release auditor reviews only three binary criteria:
   - *Criterion A (Spec Conformance)*: Does the change deliver what the approved specification or task DAG explicitly defined?
   - *Criterion B (Sensor Verification)*: Did all automated sensors pass cleanly with verifiable evidence (`EVD-XXXX`)?
   - *Criterion C (Scope Containment)*: Are touched files strictly within authorized boundaries with zero collateral drift?
3. **Spec Defect Attribution**:
   If automated tests pass green but business behavior is incorrect in staging or production, the failure is classified as a **Specification / Test Gap Defect**, not a breakdown of agent trust. The fix requires updating the specification and establishing the missing automated test scenario first.

### Pillar III: Context & Token Hygiene Protocol
1. **Prompt Cache Stability**:
   Static system directives, schemas, and governance rules must remain anchored at the root of context prompts to maximize LLM KV-cache hit ratios (>90% cached prompt reads).
2. **Observation Budgeting & Output Filtering**:
   - Terminal executions and audit commands must apply strict limiters (e.g., `--max-lines`, `--depth`, path filtering).
   - Broad recursive directory listings and full dumps of uncompressed logs into agent context are prohibited.
   - Code inspections must be surgical (targeted line ranges and ripgrep queries) rather than whole-file dumps whenever feasible.

---

## 3. Consequences

### Positive
- **Drastic Reduction in Code Bloat**: Agents produce minimal, idiomatic, maintainable code without speculative abstractions.
- **Scalable Merge Velocity**: Product Owners verify conformance against specifications and automated sensor output rather than acting as human compilers.
- **Lower Operational Cost & Higher Reasoning Quality**: Context window pollution is minimized, preventing LLM attention degradation and token cost runaway.
- **Deterministic Traceability**: Every merge eligibility decision is backed by cryptographic or execution evidence logs.

### Negative / Tradeoffs
- **Spec Upfront Discipline**: Requires writing explicit Given-When-Then criteria and formal task DAGs before code generation.
- **Tooling Rigor**: Requires maintainers to write automated sensor checks and maintain strict linters/verifiers rather than relying on informal code reviews.
