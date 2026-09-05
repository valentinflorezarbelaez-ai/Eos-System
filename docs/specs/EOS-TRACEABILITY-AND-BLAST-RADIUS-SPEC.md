# [SPEC-EOS-004]: Enterprise Relational Traceability Matrix & Blast Radius Engine

* **Domain / Module:** `src/core/ontology/relational-traceability-matrix.js` & `src/cli/mission-cli.js`
* **Status:** `APPROVED`
* **Traceability:** `GOV-RTM-001` ➔ `SPEC-EOS-004` ➔ `PLAN-EOS-004` ➔ `TASKS-EOS-004`

---

## 1. Problem Statement & Enterprise Doctrine
In mission-critical software engineering (ISO 26262, IEEE 830, DO-178C), changes made without bidirectional traceability create hidden regressions, orphaned code, stale documentation, and unverified assumptions.

This specification formalizes the **Enterprise Relational Traceability Matrix (RTM) & Blast Radius Engine (`eos trace`)** in the EOS Control Plane.

---

## 2. 7-Layer Vertical Traceability Model

The RTM establishes mathematical, bidirectional links across 7 continuous layers:
```text
[L0: Business Intake]        docs/intake/<project>/
         ↕ (DERIVED_FROM / INFORMS)
[L1: EARS Specifications]    docs/specs/<project>/
         ↕ (ARCHITECTED_BY / DECIDED_IN)
[L2: Architecture Plans/ADR] docs/plans/ & docs/architecture/adrs/
         ↕ (DECOMPOSED_INTO / SCHEDULES)
[L3: Atomic Task DAG]        docs/tasks/
         ↕ (IMPLEMENTED_BY / MUTATES)
[L4: Source Code / AST]      src/...
         ↕ (VERIFIED_BY / COVERS)
[L5: Test Suites]            tests/...
         ↕ (SEALED_BY / CERTIFIES)
[L6: Cryptographic Evidence] docs/evidence/*.json (SHA-256)
```

---

## 3. Functional Requirements (EARS Syntax)

* **FR-01 (Event-Driven — Project Matrix Construction)**:
  CUANDO el usuario o agente invoque `eos trace --project <PROJECT_ID>`, EL SISTEMA construirá el grafo relacional bidireccional conectando intake, especificaciones, planes, tareas, código, tests y evidencias del proyecto seleccionado.

* **FR-02 (Event-Driven — Multi-Layer Blast Radius Calculation)**:
  CUANDO se consulte el impacto de una entidad o archivo (`eos trace --file <ruta>` o `eos trace --entity <ID>`), EL SISTEMA calculará el radio de impacto transitivo upstream y downstream, listando todos los tests que deben re-ejecutarse y las evidencias marcadas como obsoletas (`STALE_REVALIDATION_REQUIRED`).

* **FR-03 (State-Driven — Risk Tier Classification)**:
  MIENTRAS el motor calcule el radio de impacto, EL SISTEMA asignará un nivel de riesgo determinista:
  - `LOW`: 0-1 componentes afectados; ciclo TDD estándar.
  - `MEDIUM`: 2-4 componentes afectados; revalidación de suite de integración.
  - `HIGH`: 5-9 componentes afectados; auditoría formal requerida antes de merge.
  - `CRITICAL`: >= 10 componentes afectados o cambio en contratos de arquitectura; requiere autorización humana explícita (HITL Gate).

* **FR-04 (Ubiquitous / Permanent — Pure L0 Zero NPM Dependencies)**:
  EL SISTEMA implementará el grafo relacional y el cálculo de impacto utilizando estructuras puras de Node.js (`Map`, `Set`, `node:fs`, `node:path`, `node:crypto`).

* **FR-05 (Event-Driven — Dual Output Format)**:
  CUANDO se solicite la bandera `--json`, EL SISTEMA emitirá la estructura completa serializable del grafo relacional para automatización de subagentes; por defecto, emitirá una vista visual formateada en árbol ASCII en terminal.

---

## 4. Acceptance Criteria (BDD / GIVEN-WHEN-THEN)

```gherkin
ESCENARIO 01: Trazabilidad completa de un proyecto registrado (PRJ-APP-FUERZA)
  DADO el proyecto registrado 'PRJ-APP-FUERZA' con especificaciones y evidencias existentes
  CUANDO se ejecuta 'eos trace --project PRJ-APP-FUERZA'
  ENTONCES la terminal renderiza el árbol de linaje desde Intake hasta Evidencia
  Y muestra la correlación con 'EVD-0060.json' y su hash SHA-256
  Y el comando finaliza con código de salida 0

ESCENARIO 02: Cálculo de Radio de Impacto (Blast Radius) sobre un archivo de código
  DADO un archivo de dominio sensible como 'src/core/runtime/project-pipeline-runner.js'
  CUANDO se ejecuta 'eos trace --file src/core/runtime/project-pipeline-runner.js'
  ENTONCES el sistema reporta los archivos dependientes directos y transitivos
  Y lista los tests específicos que cubren dicho archivo ('tests/project-pipeline-runner.test.js')
  Y asigna un nivel de riesgo proporcional ('MEDIUM' o 'HIGH')
  Y sugiere la acción de revalidación exacta
```
