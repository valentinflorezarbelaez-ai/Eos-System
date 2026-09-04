# [SPEC-XXXX]: [Feature / Component Name]

* **Domain / Project:** `[project-id]`
* **Status:** `[DRAFT | APPROVED | IN_PROGRESS | VERIFIED | ARCHIVED]`
* **Traceability Links:** `[SOURCE-ID]` ➔ `[SPEC-XXXX]` ➔ `[PLAN-XXXX]` ➔ `[EVD-XXXX]`

---

## 1. Context & Business Intent (The "Why")
[Brief 1-2 paragraph description: What business problem does this solve, who are the actors, and why is it worth building?]

## 2. Actors & User Stories
* **US-1**: Como `[rol]` quiero `[acción]` para `[beneficio / valor de negocio]`.

---

## 3. Functional Requirements (EARS Syntax)
*Each requirement MUST follow one of the 4 formal EARS patterns:*

* **FR-01 (Event-Driven)**: CUANDO `[evento desencadenante]`, EL SISTEMA `[acción esperada y código de salida/resultado]`.
* **FR-02 (State-Driven)**: MIENTRAS `[estado o condición activa]`, EL SISTEMA `[comportamiento continuo]`.
* **FR-03 (Error / Unwanted Condition)**: SI `[condición anómala o error]`, ENTONCES EL SISTEMA `[respuesta controlada sin fallar en silencio]`.
* **FR-04 (Ubiquitous / Permanent)**: EL SISTEMA `[regla transversal invariable, p. ej. formato de datos, persistencia]`.

---

## 4. Non-Functional & Quality Requirements (NFR)
* **NFR-SEC-01 (Security)**: `[Auth, sanitization, zero plain secrets, OWASP top 10]`
* **NFR-PERF-01 (Performance)**: `[LCP < 2.5s, CLS < 0.1, FID/INP < 200ms, bundle budget]`
* **NFR-A11Y-01 (Accessibility)**: `[WCAG 2.1 AA compliance, keyboard navigation, aria-labels]`
* **NFR-SEO-01 (SEO / Metadata)**: `[Canonical URLs, OpenGraph, JSON-LD schema, semantic headings]`
* **NFR-ARCH-01 (Architecture)**: `[Clean/Hexagonal boundary: Core business logic independent of UI/framework]`

---

## 5. Acceptance Criteria (BDD / GIVEN-WHEN-THEN)
```gherkin
ESCENARIO 01: [Nombre del escenario principal - Camino feliz]
  DADO [precondición del sistema y estado inicial]
  CUANDO [el actor ejecuta la acción con datos válidos]
  ENTONCES [el sistema produce el resultado esperado]
  Y [el estado queda actualizado correctamente]

ESCENARIO 02: [Nombre del escenario - Caso borde o error]
  DADO [precondición con datos inválidos o estado de falla]
  CUANDO [el actor ejecuta la acción]
  ENTONCES [el sistema rechaza la operación con mensaje explicativo]
  Y [no se produce mutación inconsistente ni pérdida de datos]
```

---

## 6. Scope Boundaries
* **In Scope (Dentro de alcance)**: `[Lista explícita de lo que sí se implementa]`
* **Out of Scope (Fuera de alcance)**: `[Lista explícita de lo que NO se implementa en esta iteración]`

---

## 7. Verification & Proof Plan
* **Automated Unit/Integration Test Command**: `[Comando exacto de ejecución, p. ej. npm test]`
* **Required Evidence Artifact**: `docs/evidence/EVD-XXXX.json`
