# [SPEC-EOS-006]: Autonomous Intake & EARS Specification Synthesizer (`eos intake --synthesize`)

* **Domain / Module:** `src/core/sdd/autonomous-intake-synthesizer.js` & `src/cli/mission-cli.js`
* **Status:** `APPROVED`
* **Traceability:** `GOV-INTAKE-001` ➔ `SPEC-EOS-006` ➔ `PLAN-EOS-006` ➔ `TASKS-EOS-006`

---

## 1. Problem Statement & Operational Doctrine
In modern software engineering, unstructured user requests, conversational messages, and vague client documents lead directly to catastrophic drift, vibe coding, regressions, and wasted token budgets. Requirements that lack deterministic bounds (e.g. unstated error paths, unquantified adjectives like "fast" or "secure") cannot be mathematically validated.

This specification establishes **`AutonomousIntakeSynthesizer`** (`eos intake --synthesize`), an autonomous intake compiler within the EOS Control Plane. It ingests arbitrary unstructured text or intake documents, detects ambiguities, classifies rules into the 4 canonical EARS patterns, generates BDD Given-When-Then scenarios, binds a Master 10-Dimensional SDLC specification envelope, and builds an atomic task DAG with SHA-256 cryptographic provenance.

---

## 2. Architectural Topology

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. RAW INTAKE INGESTION (Text prompt, markdown, JSON, notes)│
│    docs/intake/<project>/... or CLI --input                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. AMBIGUITY & VAGUENESS SCANNER                            │
│    Scans unquantified adjectives ("fast", "modern", etc.)   │
│    Flags missing boundary cases and enforces hard metrics   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. EARS SYNTHESIS REACTOR (4 Canonical Patterns)            │
│    - Event-Driven (WHEN <event>, THE SYSTEM SHALL <action>)  │
│    - State-Driven (WHILE <state>, THE SYSTEM SHALL <action>) │
│    - Error-Driven (IF <unwanted>, THEN THE SYSTEM SHALL)    │
│    - Ubiquitous   (THE SYSTEM SHALL <always>)               │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. BDD ACCEPTANCE SCENARIO COMPILER                         │
│    Generates GIVEN-WHEN-THEN scenarios for each requirement │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. 10-D SDLC ENVELOPE & ATOMIC TASK DAG EMITTER             │
│    Compiles via MasterSdlcNanometricEngine &                │
│    NanometricSpecPlanner, binds RTM L0 ➔ L1 ➔ L2 ➔ L3 links │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Functional Requirements (EARS Syntax)

* **FR-01 (Event-Driven — Ambiguity & Vagueness Detection)**:
  CUANDO el sintetizador reciba texto sin procesar o archivos de entrada, EL SISTEMA escaneará la presencia de terminología subjetiva, vaga o desprovista de métricas cuantificables (tales como "rápido", "fácil", "óptimo", "moderno", "escalable", "etc.", "seguro", "amigable") y generará una lista estructurada de advertencias con recomendaciones de acotamiento formal.

* **FR-02 (Event-Driven — EARS 4-Pattern Classification & Extraction)**:
  CUANDO el sintetizador procese los enunciados de requerimiento, EL SISTEMA clasificará cada requerimiento dentro de exactamente uno de los 4 patrones EARS canónicos:
  1. `EVENT_DRIVEN`: "CUANDO <evento desencadenante>, EL SISTEMA <respuesta observable>".
  2. `STATE_DRIVEN`: "MIENTRAS <estado o modo activo>, EL SISTEMA <comportamiento continuo>".
  3. `ERROR_DRIVEN`: "SI <condición anómala o error>, ENTONCES EL SISTEMA <respuesta defensiva o recuperación>".
  4. `UBIQUITOUS`: "EL SISTEMA <invariante o propiedad continua permanente>".

* **FR-03 (State-Driven — BDD Scenario Derivation)**:
  MIENTRAS cada requerimiento EARS se encuentre verificado y clasificado, EL SISTEMA derivará automáticamente uno o más escenarios BDD en formato GIVEN-WHEN-THEN (`DADO ... CUANDO ... ENTONCES ... Y ...`) preservando trazabilidad unívoca con el ID del requerimiento (`FR-XX`).

* **FR-04 (Event-Driven — 10-Dimensional SDLC Envelope Compilation)**:
  CUANDO se solicite la compilación completa de la especificación, EL SISTEMA invocará `MasterSdlcNanometricEngine` y `NanometricSpecPlanner` para estructurar las 10 dimensiones SDLC nanométricas, generar el DAG de tareas atómicas y calcular el hash criptográfico SHA-256 de todo el paquete.

* **FR-05 (Event-Driven — Artifact Generation & Traceability Links)**:
  CUANDO se indique un directorio de salida o proyecto objetivo, EL SISTEMA generará los archivos `spec.md`, `plan.md` y `tasks.md` en `docs/specs/<project>/`, enlazando la capa `L0_INTAKE` con `L1_SPEC`, `L2_PLAN` y `L3_TASK` para la Matriz de Trazabilidad Relacional (RTM).

* **FR-06 (Ubiquitous / Permanent — Pure L0 Zero Dependencies)**:
  EL SISTEMA implementará el sintetizador utilizando exclusivamente módulos nativos de Node.js (`node:fs`, `node:path`, `node:crypto`).

---

## 4. Acceptance Criteria (BDD / GIVEN-WHEN-THEN)

```gherkin
ESCENARIO 01: Detección y reporte de ambigüedades en intake
  DADO un texto de intake con términos vagos como "sistema muy rápido y moderno"
  CUANDO AutonomousIntakeSynthesizer.scanAmbiguities(rawText) es invocado
  ENTONCES el resultado contiene al menos 2 hallazgos de ambigüedad
  Y cada hallazgo incluye el término detectado y una sugerencia de métrica cuantificable

ESCENARIO 02: Clasificación de requerimientos en los 4 patrones EARS
  DADO un listado de enunciados con eventos, estados, errores e invariantes
  CUANDO AutonomousIntakeSynthesizer.synthesizeEarsRequirements(rawText) es ejecutado
  ENTONCES cada requerimiento generado posee un patrón EARS válido (EVENT_DRIVEN, STATE_DRIVEN, ERROR_DRIVEN o UBIQUITOUS)
  Y el texto generado cumple con la sintaxis formal EARS

ESCENARIO 03: Generación de escenarios de aceptación BDD
  DADO un conjunto de requerimientos EARS formalizados
  CUANDO AutonomousIntakeSynthesizer.generateBddScenarios(earsRequirements) es invocado
  ENTONCES se genera al menos un escenario GIVEN-WHEN-THEN para cada requerimiento
  Y el escenario referencia el identificador exacto del requerimiento

ESCENARIO 04: Compilación completa de paquete de especificación
  DADO un proyecto registrado o un conjunto de notas de intake
  CUANDO se ejecuta AutonomousIntakeSynthesizer.compileFullSpecificationPackage(options)
  ENTONCES se genera un paquete con spec_id, 10 dimensiones SDLC y DAG de tareas
  Y el paquete posee un digest criptográfico SHA-256 inmutable

ESCENARIO 05: Ejecución por línea de comandos CLI
  DADO el CLI de EOS
  CUANDO se ejecuta 'eos intake --synthesize --input <texto> --json'
  ENTONCES la salida CLI retorna éxito (exit code 0) con el objeto JSON del paquete generado
```
