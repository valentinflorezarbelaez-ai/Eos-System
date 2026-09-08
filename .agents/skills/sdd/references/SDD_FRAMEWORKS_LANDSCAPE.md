# SDD Frameworks Landscape — Reference Guide

> **Purpose:** Give EOS agents and operators working knowledge of the major Spec-Driven Development frameworks in the agentic ecosystem (2025–2026). EOS uses a **dual-route** architecture (OpenSpec + Spec-Kit). This reference documents the broader landscape for compatibility, evaluation, and informed decision-making.
>
> **Governing ADR:** [ADR-0010](../../../../docs/architecture/adrs/ADR-0010-lidr-specboot-gentleman-discipline-bridge.md)

---

## 1. Framework Comparison Matrix

| Framework | Creator | Philosophy | Ceremony Level | Best For | EOS Position |
|---|---|---|---|---|---|
| **OpenSpec** | Fission-AI | Living delta-specs, lightweight evolution | Low–Medium | Brownfield, agile teams, incremental refactoring | ✅ **PRIMARY** (brownfield route) |
| **Spec-Kit** | Community | Constitution + governance gates, compliance-first | High | Enterprise, regulated, security-critical, greenfield | ✅ **PRIMARY** (critical route) |
| **BMAD** | bmad-method | Full-lifecycle, persona-based multi-agent | High | Complex features, team simulation, deep planning | 📖 **REFERENCE** |
| **Superpowers** | Roo Code community | Prescriptive skill execution, methodical | Medium–High | Agentic consistency, skill-driven workflows | 📖 **REFERENCE** |
| **GSD** | Community | Get Stuff Done, minimal ceremony | Low | Solo developers, rapid prototyping, anti-ceremony | 📖 **REFERENCE** |

---

## 2. Detailed Framework Profiles

### 2.1 OpenSpec (Fission-AI)

**Philosophy:** Create durable, lightweight "change contracts" between stakeholders and AI agents. Treat specifications as living documents that evolve with the code.

**Workflow:**
```text
Propose → Apply → Archive
   │         │        │
   ▼         ▼        ▼
proposal.md  code   spec deltas
 spec.md    tests    merged into
 design.md          current-behavior
 tasks.md           specs
```

**Key Artifacts:** `proposal.md`, `spec.md`, `design.md`, `tasks.md` — all stored in `openspec/changes/<change>/`

**Strengths:**
- Tool-agnostic: works with any AI agent (Cursor, Claude Code, Windsurf, Antigravity)
- Lightweight ceremony — doesn't slow down experienced teams
- Delta-based: describes what CHANGES, not the entire system
- Easy incremental adoption: add to existing projects without restructuring
- Schema-first: `config.yaml` defines the project context once

**Weaknesses:**
- Less formal for high-risk domains (no constitutional gates)
- Depends on team discipline — nothing forces agents to follow the cycle
- Limited governance for multi-team or enterprise scenarios
- No built-in security or compliance checkpoints

**EOS Integration:**
- **PRIMARY** brownfield route per ADR-0010
- Runtime layout: `openspec/specs/`, `openspec/changes/`
- Slash commands: `/propose`, `/apply`, `/archive` (aliases: `opsx:propose`, etc.)
- Manual: `docs/manuals/OPENSPEC_RUNTIME.md`

---

### 2.2 Spec-Kit (Community)

**Philosophy:** Define a "Constitution" — the architectural and security standards — BEFORE any code is written. Enforce governance through explicit phase gates and authorization levels.

**Workflow:**
```text
Specify → Plan → Task → Implement → Verify
   │        │       │        │          │
   ▼        ▼       ▼        ▼          ▼
Constitution  ADRs  Task DAG  TDD     Evidence
EARS specs   Design  Atomic   Code    Audit
BDD criteria        tasks    Tests    Gate
```

**Key Artifacts:** Constitution, EARS specs, BDD acceptance criteria, ADRs, Task DAGs, Evidence logs

**Strengths:**
- Rigorous governance with explicit authorization levels
- Full traceability from business requirements to evidence
- Audit-ready: every decision is documented with rejected alternatives
- Strong security posture: secrets, inputs, and auth verified at spec level
- Ideal for compliance-heavy environments (HIPAA, PCI, SOC2)

**Weaknesses:**
- Heavy ceremony: overkill for small changes or prototyping
- Slower iteration: every change goes through formal gates
- Steeper learning curve for teams accustomed to agile
- Can create bottlenecks if PO approval is required for everything

**EOS Integration:**
- **PRIMARY** critical route per ADR-0010
- Used for: Constitution edits, Level 2+ changes, security-sensitive domains
- EARS syntax: EOS local convention (not LIDR import — see ADR-0010 §4.1)
- BDD/GWT preferred for acceptance criteria

---

### 2.3 BMAD (Breakthrough Method for Agile AI-Driven Development)

**Philosophy:** Simulate a full professional development team through specialized AI agent personas (Analyst, PM, Architect, Developer, QA). Each persona produces specific artifacts that feed the next.

**Workflow:**
```text
Analyst → PM → Architect → Developer → QA
   │       │       │           │         │
   ▼       ▼       ▼           ▼         ▼
 JTBD    PRD    Tech Design   Code    Validation
 User   Stories  Architecture  TDD     Acceptance
 Research       Data Models          Tests
```

**Key Artifacts:** PRD, Architecture doc, Story files (granular tasks), Test plans

**Setup:** `npx bmad-method install` → creates `.bmad-core/` with persona definitions

**Strengths:**
- Comprehensive elicitation: forces thorough discovery before coding
- Persona separation prevents "drift" — each agent has a focused scope
- Well-structured for complex features requiring deep planning
- Built-in correction loops between personas
- Strong community and documentation

**Weaknesses:**
- Heavyweight: the full persona cycle is expensive in tokens and time
- Opinionated about agent organization — may conflict with existing team structures
- Personas can be redundant for experienced teams who naturally cover these roles
- Installation adds framework files to the repo (`.bmad-core/`)

**EOS Position:** 📖 **REFERENCE** — Compatible patterns adopted:
- Multi-agent role separation → EOS uses Exploration/Implementation/Verification phase separation (similar concept, different mechanism)
- Structured artifact pipeline → EOS pipeline steps 1–7 cover the same ground
- NOT adopted: persona files, `.bmad-core/` directory, `npx bmad-method` installation

---

### 2.4 Superpowers (Roo Code Community)

**Philosophy:** Enforce agentic consistency through prescriptive "skills" — each skill is a methodical procedure that the agent must follow step-by-step. The agent executes skills, not free-form prompts.

**Workflow:**
```text
Skill Selection → Skill Execution → Verification → Handoff
       │                │                │            │
       ▼                ▼                ▼            ▼
  Match task to    Follow skill     Check outputs   Pass to
  appropriate      procedure        against skill   next skill
  skill           step-by-step      criteria        or complete
```

**Strengths:**
- Highly deterministic: agents follow explicit procedures, reducing hallucination
- Skill library is extensible and composable
- Good for teams that want strict control over agent behavior
- Skills serve as executable documentation

**Weaknesses:**
- Prescriptive nature can be rigid — doesn't adapt well to novel situations
- Skill authoring requires significant upfront investment
- Can create skill sprawl if not carefully managed
- Less suited for creative or exploratory work

**EOS Position:** 📖 **REFERENCE** — Compatible patterns adopted:
- Skill-based agent organization → EOS `.agents/skills/` directory follows the same pattern
- Procedure-based execution → EOS skills have explicit procedures with evidence requirements
- NOT adopted: the specific skill format, runtime, or Roo Code integration

---

### 2.5 GSD (Get Stuff Done)

**Philosophy:** Minimal ceremony. Write a lightweight spec, build it, ship it. Anti-pattern to over-governed frameworks.

**Workflow:**
```text
Brief → Build → Ship
  │       │       │
  ▼       ▼       ▼
1-page  Code +  Deploy
spec    Tests
```

**Strengths:**
- Extremely fast for small to medium features
- Low friction — doesn't slow down experienced developers
- Good for prototyping and MVPs
- Anti-bureaucracy stance resonates with solo developers

**Weaknesses:**
- Insufficient governance for production systems
- No security checkpoints
- No formal traceability or audit trail
- Scales poorly to multi-contributor or enterprise projects
- Risk of accumulating technical debt

**EOS Position:** 📖 **REFERENCE** — Compatibility:
- EOS's DIRECT route (ADR-0010 §2) is conceptually similar for trivial changes
- GSD's philosophy is the *anti-pattern* that Harness Engineering was designed to prevent
- The Acceleration Whiplash data (KI-ACCELERATION-WHIPLASH) empirically demonstrates the risks of GSD-like approaches at scale

---

## 3. Decision Matrix: When to Use What

| Scenario | Recommended Framework | EOS Route |
|---|---|---|
| One-line fix, typo, formatting | None (DIRECT) | DIRECT |
| Small feature, existing patterns | OpenSpec (lightweight delta) | OpenSpec |
| New subsystem, public API | Spec-Kit (full governance) | Spec-Kit |
| Complex feature with deep requirements | BMAD-like deep discovery + Spec-Kit | Spec-Kit (with enriched intake) |
| Enterprise/compliance environment | Spec-Kit | Spec-Kit |
| Rapid prototype / MVP | GSD-like approach | DIRECT or OpenSpec |
| Unknown codebase, legacy modernization | OpenSpec (delta-based, incremental) | OpenSpec |
| Team using BMAD externally | Understand their artifacts, map to EOS equivalents | EOS pipeline steps 1–7 |

---

## 4. Framework Interoperability with EOS

### Mapping BMAD Artifacts → EOS Pipeline

| BMAD Artifact | EOS Equivalent | Location |
|---|---|---|
| PRD | `proposal.md` + `docs/intake/` | `openspec/changes/<change>/proposal.md` |
| Architecture Doc | ADR + `design.md` | `docs/architecture/adrs/` |
| Story Files | `tasks.md` (Task DAG) | `openspec/changes/<change>/tasks.md` |
| Test Plan | BDD acceptance criteria | In `spec.md` or `docs/specs/` |

### Mapping Superpowers Skills → EOS Skills

| Superpowers Concept | EOS Equivalent | Location |
|---|---|---|
| Skill file | `SKILL.md` | `.agents/skills/<name>/SKILL.md` |
| Skill procedure | Procedure section with steps | Within SKILL.md |
| Skill verification | Evidence Requirements section | Within SKILL.md |
| Skill composition | Multi-skill activation by task context | Contextual Skill Loading in AGENTS.md |

---

## 5. NON-Goals (What EOS Does NOT Import)

Per ADR-0010 §5 and EOS Constitution:

| Framework Element | Status | Reason |
|---|---|---|
| BMAD `.bmad-core/` directory | ❌ REFUSED | Foreign framework files in repo violate EOS tool-agnostic architecture |
| BMAD persona agent configs | ❌ REFUSED | EOS uses phase-based separation, not persona-based |
| Superpowers runtime/CLI | ❌ REFUSED | Would add external dependency; EOS skills are self-contained markdown |
| GSD "no governance" philosophy | ❌ REFUSED | Contradicts Evidence Over Claims and Harness Engineering doctrine |
| Any framework's npm dependencies | ❌ REFUSED | `DEPENDENCY_POLICY_L0.md` — `NODE_BUILTINS_ONLY` for L0 core |
| Dogmatic coverage quotas from any framework | ❌ REFUSED | Risk-based TDD per ADR-0010 |
