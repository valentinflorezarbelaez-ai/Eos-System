# [SPEC-EOS-003]: Autonomous Project Onboarding & Fleet Observability Engine

* **Domain / Module:** `src/core/projects/` & `src/cli/mission-cli.js`
* **Status:** `APPROVED`
* **Traceability:** `GOV-FLEET-001` ➔ `SPEC-EOS-003` ➔ `PLAN-EOS-003` ➔ `TASKS-EOS-003`

---

## 1. Problem Statement & Strategic Objective
Currently in EOS, onboarding an external repository (e.g. `PRJ-APP-FUERZA`, `PRJ-FUNDACION`) requires manual authoring of JSON registration records in `docs/projects/registrations/` and intake markdown in `docs/intake/`.

This specification formalizes:
1. **Autonomous Project Onboarding (`eos project onboard <path>`)**: A deterministic engine that scans any target directory, executes 10-domain technical discovery, validates runtime manifests, creates a schema-compliant registration contract, and registers the project into `docs/projects/registry.json`.
2. **Fleet Observability (`eos fleet`)**: A unified command that surveys all registered projects, checks git branch/remote state, extracts the latest cryptographic evidence seal from `docs/evidence/`, and renders an executive status dashboard.

---

## 2. Functional Requirements (EARS Syntax)

* **FR-01 (Event-Driven — Autonomous Discovery & Ingestion)**:
  CUANDO el usuario ejecute `eos project onboard <ruta>` o `eos onboard <ruta>`, EL SISTEMA validará la existencia del directorio, ejecutará el escaneo técnico universal de 10 dominios, e inferirá el identificador único (`PRJ-<SLUG>`), tipo de proyecto, stack tecnológico y puntos de entrada.

* **FR-02 (State-Driven — Schema Compliance & Atomicity)**:
  MIENTRAS el motor genere el registro del proyecto, EL SISTEMA validará el objeto generado contra `docs/projects/schema.json`, persistiendo el archivo atómicamente en `docs/projects/registrations/<slug>.json` y actualizando `docs/projects/registry.json` sin duplicar entradas.

* **FR-03 (Ubiquitous / Permanent — Intake Context Generation)**:
  EL SISTEMA generará automáticamente `docs/intake/<slug>/PROJECT_CONTEXT.md` documentando el propósito inferido, la matriz de 10 dominios y la línea base de seguridad y dependencias.

* **FR-04 (Event-Driven — Fleet Observability Reporting)**:
  CUANDO el usuario ejecute `eos fleet` o `eos project list`, EL SISTEMA inspeccionará todos los proyectos registrados, resolverá su existencia en disco, rama git activa, estado del Write Barrier, y el último sello criptográfico SHA-256 en `docs/evidence/`, renderizando una tabla ejecutiva de alta fidelidad.

* **FR-05 (Ubiquitous / Permanent — Pure L0 Zero External Dependencies)**:
  EL SISTEMA implementará toda la lógica de onboarding y reporte utilizando módulos nativos de Node.js (`node:fs`, `node:path`, `node:child_process`, `node:crypto`), manteniendo cero dependencias de npm de terceros.

---

## 3. Acceptance Criteria (BDD / GIVEN-WHEN-THEN)

```gherkin
ESCENARIO 01: Onboarding autónomo de un proyecto existente
  DADO un directorio de proyecto local con package.json o pyproject.toml
  CUANDO se ejecuta 'eos project onboard <ruta>'
  ENTONCES se crea 'docs/projects/registrations/<slug>.json' válido según schema.json
  Y se crea 'docs/intake/<slug>/PROJECT_CONTEXT.md' con el contexto técnico
  Y el proyecto queda listado en 'docs/projects/registry.json'
  Y la terminal muestra el resumen de los 10 dominios descubiertos

ESCENARIO 02: Inspección de flota con 'eos fleet'
  DADO un conjunto de proyectos registrados en EOS (incluyendo PRJ-APP-FUERZA)
  CUANDO se ejecuta 'eos fleet'
  ENTONCES la consola muestra una tabla con Project ID, Nombre, Stack, Rama Git, Estado y Evidencia
  Y para PRJ-APP-FUERZA se visualiza el estado VERIFIED y el sello EVD-0060
  Y la ejecución finaliza con código de salida 0
```

---

## 4. Non-Functional Requirements (NFR)
* **NFR-01 (Speed):** El escaneo y generación de contratos de un proyecto de tamaño medio se ejecutará en menos de 500 ms.
* **NFR-02 (Safety):** El motor opera en modo estricto de solo lectura sobre el directorio objetivo (`targetPath`), sin mutar archivos dentro de él.
* **NFR-03 (Type & Invariant Integrity):** La incorporación del nuevo módulo no romperá ninguno de los 506 chequeos de `npm run verify:strict`.
