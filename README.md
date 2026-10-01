# EOS (Engineering Operating System)
### Autonomous Software Engineering Control Plane & Sovereign Multi-Agent Operating Fabric

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-Pure_Layer--0_Built--ins-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js L0" />
  <img src="https://img.shields.io/badge/Runtime_Dependencies-0_External_NPM-blue?style=for-the-badge" alt="Zero Dependencies" />
  <img src="https://img.shields.io/badge/Specification-IEEE_830_EARS_%2B_BDD-blueviolet?style=for-the-badge" alt="EARS / BDD" />
  <img src="https://img.shields.io/badge/Verification-913%2F913_Strict_Checks-brightgreen?style=for-the-badge" alt="Verify Strict" />
  <img src="https://img.shields.io/badge/Test_Suite-1452_Passing-success?style=for-the-badge" alt="1452 Tests Passing" />
  <img src="https://img.shields.io/badge/Consensus-NASA_IV%26V_Anti--Self--Certification-red?style=for-the-badge" alt="NASA IV&V" />
  <img src="https://img.shields.io/badge/Security-Law_VI_Zero_Plain_Secrets-orange?style=for-the-badge" alt="Law VI" />
</p>

<p align="center"><sub>Check and test counts are snapshots measured at <code>main@8903b578</code>. The live source of truth is the output of <code>npm run verify:strict</code> and <code>npm test</code> (or <code>npm run eos:hud</code>), never this README.</sub></p>

---

## 1. Executive Summary

**EOS (Engineering Operating System)** is an autonomous, deterministic, and self-governing software engineering control plane. It coordinates heterogeneous multi-agent systems to design, implement, audit, verify, and document enterprise-grade software without human drift, hallucination, or vibe coding.

Built from first principles as a **pure Layer-0 control plane** relying exclusively on native Node.js primitives (`node:crypto`, `node:fs`, `node:path`), EOS guarantees zero third-party runtime supply-chain attack vectors while enforcing strict cryptographic auditability across every operation.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                EOS CONTROL PLANE (v3.1)                                │
│                                                                                        │
│  [ Intake & Recon ] ──► [ EARS Spec Compiler ] ──► [ 7-Layer RTM & DAG Decomposition ] │
│                                                                   │                    │
│  [ Cryptographic Seal ] ◄── [ Multi-Vector QA ] ◄── [ Byzantine Council Consensus ]   │
│            │                                                                           │
│            ▼                                                                           │
│  [ Enterprise Executive Dossier Engine ] ──► C-Suite Briefings, Audit Trails, Ledgers  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Pillars & Capabilities

### I. Zero Vibe Coding (IEEE 830 / ISO 29148)
Code is never written from open-ended, conversational prompts. All software modifications are derived strictly from formal **EARS** (*Easy Approach to Requirements Syntax*) patterns and executable **Gherkin BDD** scenarios. If a requirement is ambiguous, EOS halts execution and demands formal specification refinement.

### II. 7-Layer Relational Traceability Matrix (RTM)
EOS establishes bi-directional, cryptographic traceability from business intake down to single lines of code and test receipts:
$$\text{Intake} \iff \text{Spec} \iff \text{Plan} \iff \text{Atomic Task} \iff \text{Source Code} \iff \text{Test Suite} \iff \text{EVD Receipt}$$
Every file edit recalculates transitive blast radius, preventing unintended regression cascades across enterprise codebases.

### III. Autonomous Executive Dossier & Enterprise Reporting
EOS synthesizes execution telemetry, RTM graphs, and cryptographic evidence into automated, publication-ready executive briefings for leadership, auditors, and stakeholders:
- **Fleet Executive Summaries:** Multi-project health, velocity, and invariant adherence.
- **Project Executive Dossiers:** Deep technical audit, architectural trade-offs, and compliance status.
- **Cryptographic Audit Ledgers:** SHA-256 verifiable proof of test passes, zero secrets, and zero invariant violations.

### IV. Closed-Loop Auto-Healing & Bounded FDIR
Runtime anomalies, invariant drift, and broken tests are detected by autonomous sentinels. Faulty components are quarantined, state snapshots are rolled back, and surgical TDD remediation loops execute within strict bounds (`maxRetries=3`) before deterministic escalation to Human-in-the-Loop (HITL).

### V. Byzantine Multi-Agent Consensus
Enforcing NASA IV&V (*Independent Verification and Validation*) standards, no single agent or model may certify its own work. Architecture, Security, Quality, and Verification desks hold binding VETO powers.

---

## 3. The 21-Step Master Engineering Pipeline

Every EOS-managed initiative progresses through an inviolable 21-step deterministic pipeline:

```text
 1. INTAKE                  ➔ Ingest client assets, meeting notes, prompts into docs/intake/
 2. RECONNAISSANCE          ➔ Technical audit of existing codebase, dependencies, and environment
 3. CONTEXT UNDERSTANDING   ➔ Inventory assets, domain models, business constraints, and persona goals
 4. REQUIREMENTS (EARS)     ➔ Formalize Functional (EARS) and Non-Functional Requirements (NFR)
 5. RESEARCH                ➔ Deep-research patterns, state-of-the-art libraries, and security advisories
 6. ARCHITECTURE            ➔ Clean/Hexagonal system design, module boundaries, data models, ADRs
 7. DESIGN                  ➔ Component wireframes, accessibility tokens, semantic layouts, UX flow
 8. SPECIFICATION APPROVAL  ➔ Human Architect reviews and approves SPEC-XXXX, PLAN-XXXX, TASKS-XXXX
 9. AUTHORIZATION GATE      ➔ Record formal LEVEL 2+ authorization in IMPLEMENTATION_AUTHORIZATION.md
10. IMPLEMENTATION          ➔ Execute atomic tasks sequentially (Domain ➔ Application ➔ Infrastructure ➔ UI)
11. UNIT & LOGIC TESTING    ➔ Run 100% logic coverage on domain rules and use case commands
12. SECURITY AUDITING       ➔ Execute Security Auditor (OWASP, secret detection, sanitization)
13. QUALITY AUDITING        ➔ Execute Quality Auditor (type safety, linter, strict contracts)
14. ACCESSIBILITY AUDITING  ➔ Execute Accessibility Auditor (WCAG 2.1 AA, keyboard navigability)
15. PERFORMANCE AUDITING    ➔ Execute Performance Auditor (Core Web Vitals, bundle budgets)
16. SEO AUDITING            ➔ Execute SEO Auditor (Schema.org JSON-LD, metadata, semantic tags)
17. BROWSER QA              ➔ Execute Browser QA (visual regressions, responsive breakpoints, user flows)
18. EVIDENCE COLLECTION     ➔ Record cryptographic execution logs in docs/evidence/EVD-XXXX.json
19. STRICT INTEGRITY AUDIT  ➔ Execute npm run verify:strict to validate 0 broken invariants
20. DEPLOYMENT              ➔ Build production bundle and deploy to target staging/production infra
21. POST-DEPLOY VERIFY      ➔ Live smoke tests, monitoring hooks, learning capture in Engram
```

---

## 4. Enterprise Reporting & Executive Dossier Engine

EOS features an integrated executive briefing engine (`ExecutiveDossierEngine`) that compiles raw engineering artifacts into high-impact executive reports tailored for C-suite executives, Board of Directors, and Senior Software Architects.

### Generating Reports via CLI

```bash
# Generate fleet-wide executive summary across all onboarded enterprise projects
node bin/eos.js dossier --fleet --save

# Generate project-specific executive dossier with complete RTM audit
node bin/eos.js dossier --project PRJ-APP-FUERZA --save

# Export structured reporting metrics for enterprise analytics
node bin/eos.js dossier --fleet --json
```

### Report Output Structure

Each generated dossier provides:
1. **Executive Verdict:** Unambiguous status (`HEALTHY`, `DEGRADED`, `BLOCKED`, `NEEDS_REMEDIATION`).
2. **Key Metrics:** Test coverage, verification check count, mutation blast radius, and invariant health.
3. **Traceability Matrix:** Complete breakdown of requirements traced to implementation lines and test evidence.
4. **Epistemic Classification:** Honest demarcation between `VERIFIED`, `ASSUMPTION`, and `RISK`.
5. **Cryptographic Proof:** SHA-256 seal of the dossier content, guaranteeing zero retroactive tampering.

Sample generated dossiers are stored in [`docs/reports/executive/`](docs/reports/executive/).

---

## 5. CLI Command Reference

The EOS Control Plane executable is available via `node bin/eos.js` or `eos`:

| Command | Description |
|---|---|
| `eos doctor` | Read-only diagnostic of control plane integrity, MCP configuration, and homedir isolation. |
| `eos dossier` | Generates enterprise executive reports and fleet health summaries. |
| `eos trace` | Inspects 7-layer RTM graphs and calculates mutation blast radius for any file or entity. |
| `eos intake` | Scans inputs, synthesizes formal EARS requirements, and decomposes atomic task DAGs. |
| `eos loop` | Closed-loop mutation sensor that runs surgical TDD auto-healing on impacted suites. |
| `eos council` | Multi-agent Byzantine peer review engine with binding VETO desks and anti-self-certification. |
| `eos swarm` | Provisions isolated Git worktree sandboxes for concurrent agent task execution. |
| `eos falsify` | Stochastic property-based invariant falsifier with automated test case shrinking. |
| `eos safety` | NASA / JPL 10 Safety-Critical Rules static analyzer for deterministic control flow. |
| `eos orchestrate` | Executes the complete 21-step engineering pipeline for registered projects. |
| `eos elevate` | Elite autonomous multi-vector code audit, root-cause analysis, and TDD healing. |

---

## 6. The Seven Inviolable Commandments

1. **The Law of Specification as Supreme Truth:** Code is a derived, transient artifact generated strictly against formal specifications. Improvised vibe coding is strictly forbidden.
2. **The Law of the Strict Gate:** Zero implementation code may be written until Intake, EARS Specs, BDD Acceptance Criteria, ADRs, and Implementation Authorization are approved.
3. **The Law of Evidence Over Claims:** No agent may claim `DONE` or `VERIFIED` without verifiable execution evidence (exit code 0 terminal logs, deterministic receipts).
4. **The Law of the External Write Barrier:** External target project repositories are write-protected. Writes are denied fail-closed unless explicit authorization gates are cleared.
5. **The Law of Architectural Purity:** Clean / Hexagonal boundaries are non-negotiable. Domain models contain zero framework, UI, or I/O dependencies.
6. **The Law of Absolute Security (Law VI):** Hardcoded secrets, API tokens, or vendor credentials in code or commits trigger immediate failure.
7. **The Law of Technical Artifact Discipline:** All code, documentation, schemas, commit messages, and ADRs must be written in standard professional English.

---

## 7. Epistemic Taxonomy & Evidence Standards

EOS rejects false claims and speculative optimism. All claims must adhere to the formal epistemic lifecycle:

| Epistemic State | Operational Meaning |
|---|---|
| `AUDIT_EXECUTED` | Automated tests/checks have run; raw terminal logs captured. |
| `FINDINGS_IDENTIFIED` | Invariant deviations, bugs, lint warnings, or vulnerabilities detected. |
| `REMEDIATION_REQUIRED` | A formal remediation plan is required to address findings. |
| `REMEDIATION_IN_PROGRESS`| Targeted, surgical fixes being developed and applied. |
| `REVALIDATION_REQUIRED` | Fixes applied; awaiting full regression verification. |
| `VERIFIED` | Deterministic evidence (exit code 0, clean logs) proves total conformance. |
| `PRODUCTION_READY_WITHIN_TESTED_SCOPE` | Zero open findings strictly within executed scenarios. |
| `PRODUCTION_READY` | 100% verified across all required quality dimensions. |

---

## 8. Verification & Test Suite

EOS validates its own integrity through strict, deterministic automated suites:

```bash
# Execute strict invariant verification (913/913 checks at main@8903b578; trust this run's output)
npm run verify:strict

# Execute complete test suite (1452/1452 tests at main@8903b578; trust this run's output)
npm test

# Run sovereign agentic memory port tests (Mission BW / SPEC-0080)
npm run test:mission-bw

# Run autonomous self-healing sentinel tests (Mission BX / SPEC-0081)
npm run test:mission-bx

# Run full health diagnostics
node bin/eos-doctor.js
```

---

## 9. Architecture & Governance Specifications

- [The EOS Constitution](CONSTITUTION.md) — Supreme operational commandments and governance doctrine.
- [Workspace Agent Operating Protocol](.agents/AGENTS.md) — Standard operating procedures for AI coding copilots.
- [Dependency Policy L0](DEPENDENCY_POLICY_L0.md) — Layer-0 purity requirements and zero-dependency doctrine.
- [Architectural Decision Records (ADRs)](docs/adrs/) — Version-controlled architectural choices and rejected alternatives.
- [Executive Dossiers & Reports](docs/reports/executive/) — Automated executive briefings and fleet health summaries.

---

## 10. License & Intellectual Property

Proprietary and confidential. Developed under the EOS Autonomous Engineering System governance framework. Unauthorized reproduction, modification, or distribution without explicit cryptographic authorization is strictly prohibited.
