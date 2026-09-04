# EOS P3.3 Technical Specification: Role & Skill Registry Runtime

**Document ID:** SPEC-P3-3-001  
**Status:** CANONICAL_IMPLEMENTATION_SPEC  
**Date:** 2026-08-20  
**Authority:** Human Director & EOS Senior Systems Architect  

---

## 1. Overview & Architecture

Milestone P3.3 establishes the **Role & Skill Registry Runtime (`src/core/roles/role-skill-registry-engine.js`)** providing governed, multi-dimensional role selection and independent reviewer assignment for all mission tasks:
1. **Canonical Role Profiles (`docs/schemas/role-profile.schema.json`)**: 5 foundational roles (`SYSTEM_ARCHITECT`, `FRONTEND_ENGINEER`, `BACKEND_ENGINEER`, `QA_ENGINEER`, `SECURITY_AUDITOR`) declaring domain capabilities, evidence levels (`PROVEN`, `DISCOVERED`, `DECLARED`), tool access, authority limits, and performance metrics.
2. **Selection & Justification Engine**: Evaluates tasks against candidate roles based on:
   - **Capability Fit (50%)**: Evidence-weighted domain matching.
   - **Security & Authority Fit (30%)**: Verifies `role.max_authority >= task.authority_level`.
   - **Reliability Fit (10%)**: Historical task score and low correction rate.
   - **Cost Tier Fit (10%)**: Budget alignment.
3. **Independent Reviewer Assignment Invariant**: Guarantees `author_role_id !== reviewer_role_id` (e.g. Frontend author is audited by QA or Security reviewer).
4. **Agent Selection Records (`docs/schemas/agent-selection-record.schema.json`)**: Emits deterministic selection records into `.missions/<id>/selections/SEL-<task_id>.json` documenting `WHY_SELECTED`, `WHY_REJECTED`, and `hitl_escalation_required`.

```text
         Task Contract Requirement
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 RoleSkillRegistryEngine                     │
│   1. Multi-Dimensional Candidate Scoring (0-100)            │
│   2. Authority & Surface Boundary Verification              │
│   3. Independent Reviewer Assignment (Author != Reviewer)   │
│   4. HITL Escalation Check (Score < 60.0 or Auth Deficit)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Agent Selection Record                      │
│   - selected_role_id: Chosen optimal role                   │
│   - reviewer_role_id: Independent reviewing role            │
│   - scoring_breakdown: Full ranked candidate array          │
│   - why_selected: Transparent selection rationale          │
│   - why_rejected: Explicit disqualification reasons        │
│   - hitl_escalation_required: boolean                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Canonical Roles Catalog

| Role ID | Domain | Max Authority | Budget Tier | Reviewer Policy |
|---|---|---|---|---|
| `ROLE-SYSTEM-ARCHITECT` | Architecture, Contracts, ADRs | `LEVEL_2` | `STANDARD` | `ROLE-QA-ENGINEER` |
| `ROLE-FRONTEND-ENGINEER` | UI, React, Astro, WCAG 2.1 AA | `LEVEL_1` | `STANDARD` | `ROLE-QA-ENGINEER` |
| `ROLE-BACKEND-ENGINEER` | Node.js, Express, DBs, APIs | `LEVEL_1` | `STANDARD` | `ROLE-QA-ENGINEER` |
| `ROLE-QA-ENGINEER` | Unit/Integration Tests, TDD | `LEVEL_1` | `LEAN` | `ROLE-SECURITY-AUDITOR` |
| `ROLE-SECURITY-AUDITOR` | Secrets, OWASP, Governance | `LEVEL_2` | `HIGH_STAKES` | `ROLE-SYSTEM-ARCHITECT` |

---

## 3. Epistemic Claim Permitted

> **EOS can register, evaluate, and select agent roles and skills in a governed, traceable, and explainable manner, enforcing multi-dimensional capability scoring and independent reviewer assignment.**
