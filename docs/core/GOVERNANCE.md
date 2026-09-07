# EOS GOVERNANCE & ESCALATION MODEL

## Overview
This document defines the decision matrix governing autonomous operations versus operations requiring human intervention from the Product Owner.

---

## Decision Escalation Matrix

| Decision Level | Category | Examples | Execution Mode |
| --- | --- | --- | --- |
| **Level 0** | Routine Engineering | Code formatting, refactoring, writing unit tests, creating documentation | Autonomous Execution |
| **Level 1** | Architectural Choices | Module boundaries, ADR creation, internal interface design | Autonomous Execution (with ADR) |
| **Level 2** | Dependencies & Packages | Installing npm packages, dev tooling, framework setup | Autonomous Execution (with lockfile audit) |
| **Level 3** | Fundamental Business Requirements | Changing core application scope, removing core features | Human Escalation Required |
| **Level 4** | High-Risk & Security | Permanent data deletion, committing secrets, external production deployments | Human Escalation Required |
| **Level 5** | Financial & External | Purchasing services, external communications, domain changes | Human Escalation Required |

---

## Evidence & Promotion Gates

Before declaring any task or phase complete, the following gates must pass:

1. **Lint & Build Gate**: Clean build with zero syntax or compilation errors.
2. **Verification Gate**: Execution of test script (`npm run verify -- --strict`) or automated evidence log.
3. **Classification Gate**: Every claim assigned one of the 6 formal statuses (`VERIFIED`, `NOT VERIFIED`, `PARTIALLY VERIFIED`, `BLOCKED`, `ASSUMPTION`, `RISK`).
4. **Traceability Gate**: Commit created with clear conventional commit messaging.
5. **Anti-Overengineering Gate (Ponytail Ladder)**: Verification that code implements minimal solution without speculative abstractions (ADR-0011).
6. **Pre-Merge Harness Gate (Tripartite Standard)**: Confirmation of (a) Spec Compliance, (b) 100% Green Automated Sensor Evidence, and (c) Zero Scope Leakage prior to merge review.

---

## Human Decision Authority

The human Product Owner retains exclusive authority over:
- Product direction & business scope.
- Financial transactions & service purchases.
- Production releases & public deployments.
- Irreversible infrastructure actions & data destruction.
- Credential & secret rotation.

---

## External Project Lifecycle & Write Authorization Matrix

| Lifecycle Status | Prerequisites Required | External Project Write Permitted? | Required Authorization Artifact |
|---|---|---|---|
| `DISCOVERED` | Initial folder detection | `FORBIDDEN` | None |
| `REGISTERED` | Schema entry in `registry.json` | `FORBIDDEN` | `docs/projects/registrations/*.json` |
| `INTAKE` | Discovery documentation | `FORBIDDEN` | `docs/intake/*/PROJECT_CONTEXT.md` |
| `SPECIFICATION` | Spec draft created | `FORBIDDEN` | `docs/specs/*/SPEC-0001-*.md` |
| `AUDIT` | Technical audit report | `FORBIDDEN` | `docs/audits/EOS_PHASE_*_AUDIT.md` |
| `AWAITING_APPROVAL` | Gaps & decisions analyzed | `FORBIDDEN` | `DECISION_RECORD.md` |
| `IMPLEMENTATION_AUTHORIZED` | Formal Product Owner sign-off | `ALLOWED` (Scaffold / Controlled) | `IMPLEMENTATION_AUTHORIZATION.md` |
| `IMPLEMENTATION` | Authorized scope | `ALLOWED` (Controlled Scope Only) | Active `IMPLEMENTATION_AUTHORIZATION.md` |
| `STAGING` | Release Candidate ready | `FORBIDDEN` (Freeze) | `EOS_PHASE_9_STAGING_PREVIEW.md` |
| `PRODUCTION_AUTHORIZED` | Level 4 Release Sign-off | `ALLOWED` (Production Pipeline) | Product Owner Written Authorization |

