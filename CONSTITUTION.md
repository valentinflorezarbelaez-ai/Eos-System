# THE EOS MASTER CONSTITUTION & OPERATIONAL BIBLE
## Version 2.0 (The Pragmatic Synthesis: Zero Vibe Coding + Lean Engineering + Verifiable Evidence)

---

## 1. PREAMBLE & PHILOSOPHICAL FOUNDATION

The EOS Architecture exists to eradicate the two terminal diseases of contemporary software development:
1. **The Chaos of Vibe Coding** (Unchecked AI generation, missing specifications, hallucinated architectures, zero contracts, fragile state).
2. **The Paralysis of Dogmatic SDD** (Rigid upfront waterfall, excessive bureaucratic friction, spec drift, analysis paralysis where the specification ceases to be a tool and becomes a bottleneck).

EOS v2.0 establishes the **Linus Torvalds Synthesis**: absolute rigor, clean taste in code, pure domain isolation, and deterministic verification, paired with agile, pragmatic execution tracks that eliminate sterile ceremony.

---

## 2. THE SEVEN INVIOLABLE COMMANDMENTS

### I. The Law of Specification as Supreme Truth (Zero Vibe Coding)
* **The specification is the executable source of truth.** No line of domain logic or critical architecture may be written from improvised, ambiguous prompts. Code is a derived, version-controlled artifact generated strictly against formal specifications.
* If a requirement is ambiguous or underspecified, **STOP IMMEDIATELY**. Clarify, update the specification, verify alignment, and only then proceed.

### II. The Law of the Dual-Track Execution Engine (Eradicating SDD Paralysis)
Every incoming directive is categorized into one of two operational tracks:
* **Track A: Fast-Track (Operational TDD)**:
  * *Applies to:* Micro-fixes, UI token tweaks, copy adjustments, localized refactoring, documentation typos.
  * *Protocol:* Atomic Plan -> Unit/Contract Test -> Local Code Modification -> Instant Regression Verification (`verify:strict`).
  * *Overhead:* 0 unnecessary bureaucratic gates.
* **Track B: Heavy-Track (Architectural SDD)**:
  * *Applies to:* New subsystems, domain models, database schemas, authentication, payment flows, third-party integrations, security boundaries.
  * *Protocol:* Intake -> Formal EARS Specification -> BDD Scenarios -> Architecture ADRs -> Atomic DAG -> Level 2 Authorization Gate -> Phased Execution.

### III. The Law of Evidence Over Claims (Epistemic Taxonomy)
* No agent or engineer may declare a task `DONE`, `PASS`, `VERIFIED`, `SECURE`, or `PRODUCTION READY` without generating and referencing verifiable, machine-executable proof (exit code 0, raw stdout logs, cryptographic hash).
* **Epistemic States (MANDATORY)**:
  * `NOT_INITIALIZED`: Workspace or module lacks baseline structure.
  * `AUDIT_EXECUTED`: Automated verification suite executed; raw logs captured.
  * `FINDINGS_IDENTIFIED`: Bugs, lint errors, security risks, or deviations detected.
  * `REMEDIATION_REQUIRED`: Corrective action plan formulated.
  * `REMEDIATION_IN_PROGRESS`: Targeted fixes being applied.
  * `REVALIDATION_REQUIRED`: Remediation applied, awaiting regression verification.
  * `VERIFIED`: Deterministic machine evidence (exit code 0, clean signatures) proves conformance.
  * `PRODUCTION_READY_WITHIN_TESTED_SCOPE`: All quality dimensions verified within scope.
  * `PRODUCTION_READY`: 100% verified across all dimensions with zero open findings.

### IV. The Law of the External Write Barrier & Scope Containment
* Modifying external repositories or production deployments is strictly forbidden without satisfying the 6 preconditions:
  1. `REGISTERED` status in project registry.
  2. `INTAKE_COMPLETE` documented.
  3. `SPECIFICATION_APPROVED` verified.
  4. `AUDIT_COMPLETE` verified.
  5. `OWNER_APPROVAL` recorded in decision ledger.
  6. `IMPLEMENTATION_AUTHORIZED` status (`LEVEL 2`+) recorded.

### V. The Law of Architectural Purity (Clean / Hexagonal Isolation)
* **Domain Layer (Core)**: 100% pure business logic, invariants, entities, and value objects. Contains ZERO framework, UI, network, or database dependencies.
* **Application Layer**: Orchestrates use cases, commands, queries, and business workflows without knowledge of presentation details.
* **Infrastructure Layer**: Implements adapters, file system access, network I/O, database persistence, and external APIs behind abstract interfaces.
* **Presentation / UI Layer**: Thin, accessible, responsive, reactive interface decoupled from business rules.

### VI. The Law of Absolute Security & Zero Plain Secrets
* Hardcoded credentials, plain-text API keys, tokens, or confidential passwords in repository files or commits result in immediate termination of deployment.
* All external inputs must be sanitized, strictly bounded, and validated against explicit schemas.

### VII. The Law of Technical Artifact Discipline
* All code, comments, identifiers, schemas, documentation, commit messages, and ADRs must be written in **standard professional English**.
* Conversational voice and user language preferences govern chat interactions only, never repository artifacts.

---

## 3. REQUIREMENTS ENGINEERING DOCTRINE (IEEE 830 / ISO 29148)

Every requirement must satisfy the 6 Classical Quality Properties:
1. **Unambiguous**: Exactly one interpretation possible.
2. **Complete**: Defines happy paths, edge cases, error conditions, and boundaries.
3. **Verifiable**: Has a deterministic pass/fail automated test condition.
4. **Consistent**: No internal contradictions or architectural conflicts.
5. **Modifiable**: Structured modularly for non-destructive evolution.
6. **Traceable**: Linked from intake down to tests and cryptographic evidence.

### Formal EARS Syntax Standard
* **Event-Driven**: `WHEN <event>, THE SYSTEM SHALL <response>`
* **State-Driven**: `WHILE <state>, THE SYSTEM SHALL <response>`
* **Error / Unwanted Condition**: `IF <condition>, THEN THE SYSTEM SHALL <response>`
* **Ubiquitous / Permanent**: `THE SYSTEM SHALL <continuous behavior>`

### BDD Acceptance Criteria Standard
```gherkin
SCENARIO: [Identifier and Name]
  GIVEN [precondition and initial system state]
  WHEN [trigger action executed by user or system]
  THEN [observable verifiable outcome]
  AND [state invariant preserved]
```

---

## 4. FDIR PROTOCOLS (Failure Detection, Isolation & Recovery)

* **The 24/7 Pulse (`EOSSentinelDaemon`)**: Maintains continuous periodic integrity checks across system files, calculating SHA-256 signatures to detect illegal mutations or unapproved drift.
* **Graph Healing (`EOSFDIROntology`)**: Serves as the clinical firewall over the knowledge graph. Upon detecting any orphan relation (`ORPHAN_LINK_DETECTED`), it isolates and purges the invalid node, re-establishing consistency based on the verified evidence ledger.
* **Defensive Termination**: If a unit test or verification check fails, halt execution immediately. Do not modify tests merely to make them pass. Diagnose, isolate root cause, repair, and re-verify.
