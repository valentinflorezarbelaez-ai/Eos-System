# [PLAN-XXXX]: Technical Architecture Plan — [Feature / System Name]

* **Target Spec**: `[SPEC-XXXX]`
* **Status**: `[DRAFT | APPROVED | IN_EXECUTION | COMPLETED]`
* **Architect**: `[EOS Architect / Role]`

---

## 1. System Architecture & Module Boundaries
*Deconstruct the system following Clean / Hexagonal Architecture (Domain Core, Application, Adapters/Infrastructure, UI/Presentation):*

```text
┌─────────────────────────────────────────────────────────────┐
│                 PRESENTATION / UI LAYER                     │
│               (React / Astro / CLI Components)              │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    APPLICATION / USE CASES                  │
│             (Orchestrators, Services, Commands)             │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                      DOMAIN / CORE LOGIC                    │
│             (Pure entities, Value Objects, Rules)           │
└──────────────────────────────▲──────────────────────────────┘
                               │
┌──────────────────────────────┴──────────────────────────────┐
│                INFRASTRUCTURE & ADAPTERS                    │
│        (Storage, External APIs, Database, Network)          │
└─────────────────────────────────────────────────────────────┘
```

* **Module Breakdown**:
  * `[src/domain/...]` ➔ Pure business logic, zero framework dependencies.
  * `[src/application/...]` ➔ Use cases executing functional requirements.
  * `[src/infrastructure/...]` ➔ Adapters, persistence, third-party APIs.
  * `[src/ui/...]` ➔ Components, templates, styles.

---

## 2. Data Contracts & Schemas
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "DataModelName",
  "type": "object",
  "required": ["id", "created_at"],
  "properties": {
    "id": { "type": "string" },
    "created_at": { "type": "string", "format": "date-time" }
  }
}
```

---

## 3. Architecture Decision Records (ADRs) & Trade-offs
*For every significant architectural choice, record the selected approach and the rejected alternatives:*

### ADR-1: [Decision Name]
* **Decision**: `[What library, pattern, or approach was chosen]`
* **Justification**: `[Why it was chosen and which Constitution/Spec rule it satisfies]`
* **Alternatives Considered & Rejected**:
  * *Alternative A*: `[Why it was discarded - e.g., excessive bundle size, breaking zero-dep rule]`
  * *Alternative B*: `[Why it was discarded - e.g., maintenance overhead, complexity]`

---

## 4. Verification Harness & Auditor Checklist
* [ ] **Architecture Auditor**: Dependency rules verified (core has no outer dependencies).
* [ ] **Quality Auditor**: Type-safety and linter checks pass with zero errors.
* [ ] **Security Auditor**: Input validation, secret protection, zero vulnerabilities.
* [ ] **Performance Auditor**: Web Vitals / budget benchmarks met.
* [ ] **Accessibility Auditor**: Semantic HTML, screen-reader readiness, WCAG AA compliance.
* [ ] **SEO Auditor**: Metadata, structured data, canonical tags present.
* [ ] **Browser QA**: Visual regression and user flows verified.
