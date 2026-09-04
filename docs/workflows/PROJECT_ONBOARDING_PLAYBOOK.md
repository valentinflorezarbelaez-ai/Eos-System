# EOS Master Operational Playbook: End-to-End Project Execution

## Overview
This runbook establishes the **mandatory, exhaustive, step-by-step procedure** for onboarding, specifying, engineering, verifying, and releasing ANY project within the EOS ecosystem.

No project may skip or reorder these phases.

---

## The 21-Step Master Execution Pipeline

```text
 1. INTAKE                  ➔ Ingest client assets, meeting notes, prompts into docs/intake/<project>/
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

## Phase-by-Phase Checklist & Required Artifacts

### Phase 1: Intake & Reconnaissance
* [ ] Create `docs/intake/<project_name>/PROJECT_CONTEXT.md`.
* [ ] Create `docs/intake/<project_name>/CONTENT_INVENTORY.md` or `inventory.json`.
* [ ] Register project in `docs/projects/registry.json` with status `"REGISTERED"`.

### Phase 2: Requirements & Architecture
* [ ] Create `docs/specs/<project_name>/001-mvp/spec.md` using `docs/templates/SPEC_TEMPLATE.md`.
* [ ] Ensure all functional requirements follow **EARS syntax** (`CUANDO/SI/MIENTRAS/EL SISTEMA`).
* [ ] Create `docs/specs/<project_name>/001-mvp/plan.md` using `docs/templates/PLAN_TEMPLATE.md`.
* [ ] Create `docs/specs/<project_name>/001-mvp/tasks.md` using `docs/templates/TASKS_TEMPLATE.md`.
* [ ] Human Architect approves specifications.

### Phase 3: Authorization & Write Barrier
* [ ] Verify that external project path is mapped in `docs/projects/registrations/<project>.json`.
* [ ] Create `docs/projects/registrations/<project>/IMPLEMENTATION_AUTHORIZATION.md` with explicit `LEVEL 2 (Implementation Authorized)` status.
* [ ] Record decision in `DECISION_RECORD.md`.

### Phase 4: Implementation & Verification
* [ ] Agent executes tasks one by one according to `tasks.md`.
* [ ] Run all 7 Auditor Skills:
  1. `architecture-auditor`
  2. `quality-auditor`
  3. `security-auditor`
  4. `accessibility-auditor`
  5. `performance-auditor`
  6. `seo-auditor`
  7. `browser-qa`
* [ ] Generate and validate `docs/evidence/EVD-XXXX.json`.
* [ ] Run `npm run verify:strict`.

### Phase 5: Release & Continuous Improvement
* [ ] Record release report in `docs/audits/`.
* [ ] Capture architectural learnings in Engram via `mem_save`.
* [ ] Archive completed change deltas into living specs library.
