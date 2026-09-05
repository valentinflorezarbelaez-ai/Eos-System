# [SPEC-EOS-005]: Autonomous Closed-Loop Mutation Sensor & Surgical TDD Healer (`eos loop`)

* **Domain / Module:** `src/core/runtime/autonomous-loop-engine.js` & `src/cli/mission-cli.js`
* **Status:** `APPROVED`
* **Traceability:** `GOV-LOOP-001` ➔ `SPEC-EOS-005` ➔ `PLAN-EOS-005` ➔ `TASKS-EOS-005`

---

## 1. Problem Statement & Operational Doctrine
In autonomous and pair-programming engineering workflows (Anthropic Claude Code, HashiCorp Harness Standard), running complete test suites on every file save wastes cognitive bandwidth, token budgets, and CPU cycles. Conversely, coding without immediate verification introduces hidden regressions.

This specification establishes **`eos loop`**, an autonomous closed-loop sensor and surgical TDD auto-healer within the EOS Control Plane.

---

## 2. Closed-Loop Execution Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. MUTATION SENSOR (Native fs.watch + SHA-256 delta)       │
│    Detects modified source, test, or specification files    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. SURGICAL BLAST RADIUS (RelationalTraceabilityMatrix)     │
│    Resolves exact 'tests_to_revalidate' in < 50ms          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. TARGETED TEST EXECUTION (node:test isolated runner)      │
│    Executes ONLY impacted test suites                       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
             [PASS]                        [FAIL]
                │                             │
                ▼                             ▼
┌──────────────────────────────┐┌──────────────────────────────┐
│ GREEN: Sells & Updates EVD   ││ RED: Captures Failure Stack  │
│ Emits sub-second PASS badge  ││ Invokes CursorTDDAutoHealer │
└──────────────────────────────┘└──────────────────────────────┘
```

---

## 3. Functional Requirements (EARS Syntax)

* **FR-01 (Event-Driven — File Mutation Detection & Debouncing)**:
  CUANDO el usuario o subagente modifique un archivo en el proyecto objetivo, EL SISTEMA detectará el evento con `fs.watch`, aplicará un debounce de 150ms y verificará el delta criptográfico SHA-256 para descartar escrituras sin cambio.

* **FR-02 (Event-Driven — Surgical Test Resolution)**:
  CUANDO se confirme una mutación efectiva en un archivo, EL SISTEMA consultará `RelationalTraceabilityMatrix.calculateEntityBlastRadius(file)` para extraer exclusivamente la lista de `tests_to_revalidate`.

* **FR-03 (State-Driven — Execution & Status Reporting)**:
  MIENTRAS no haya tests identificados para el archivo modificado, EL SISTEMA ejecutará una comprobación sintáctica estricta (`node --check`) en menos de 50ms y emitirá el veredicto `SYNTAX_OK`.

* **FR-04 (Event-Driven — Closed-Loop Failure Diagnosis & Auto-Healing)**:
  CUANDO un test quirúrgico falle (`exitCode !== 0`), EL SISTEMA parseará el log de error con `CursorTDDAutoHealer`, extraerá la aserción y línea exacta de fallo, y si la bandera `--heal` está activa, propondrá o aplicará el parche atómico con un tope máximo de 3 intentos (`≤3 retries`).

* **FR-05 (Event-Driven — Single-Run Mode & Continuous Mode)**:
  CUANDO se invoque `eos loop --once`, EL SISTEMA ejecutará una única pasada determinista sobre los archivos modificados o la suite quirúrgica y saldrá con código 0 o 1; por defecto, permanecerá como centinela en segundo plano (`daemon`).

* **FR-06 (Ubiquitous / Permanent — Pure L0 Zero Dependencies)**:
  EL SISTEMA implementará el bucle utilizando exclusivamente módulos nativos de Node.js (`node:fs`, `node:path`, `node:child_process`, `node:crypto`).

---

## 4. Acceptance Criteria (BDD / GIVEN-WHEN-THEN)

```gherkin
ESCENARIO 01: Detección y ejecución quirúrgica en modo 'once'
  DADO un archivo de código como 'src/core/runtime/project-pipeline-runner.js'
  CUANDO se ejecuta 'eos loop --file src/core/runtime/project-pipeline-runner.js --once'
  ENTONCES el motor calcula el blast radius
  Y ejecuta exclusivamente 'tests/project-pipeline-runner.test.js'
  Y emite el reporte de ejecución con salida 0

ESCENARIO 02: Manejo de fallas y diagnóstico de auto-sanación
  DADO un test que falla deliberadamente
  CUANDO se ejecuta el bucle quirúrgico sobre dicho test
  ENTONCES el sistema captura el stacktrace con CursorTDDAutoHealer
  Y estructura el diagnóstico del fallo con errorType, mensaje y línea
  Y previene la degradación silenciosa del repositorio
```
