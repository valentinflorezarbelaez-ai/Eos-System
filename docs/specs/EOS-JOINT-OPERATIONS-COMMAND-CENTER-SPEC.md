# [SPEC-EOS-006 / SPEC-EOS-007]: Joint Operations Tactical Command Center & Mission Director (`eos ops` / `eos war-room`)

* **Domain / Module:** `src/core/runtime/joint-operations-command-center.js` & `src/cli/mission-cli.js`
* **Status:** `APPROVED`
* **Traceability:** `GOV-OPS-001` ➔ `SPEC-EOS-007` ➔ `PLAN-EOS-007` ➔ `TASKS-EOS-007`

---

## 1. Problem Statement & Operational Doctrine
Top-tier intelligence agencies (NSA, CIA, Mossad, MI6) and elite engineering consulting firms maintain centralized, high-density Situational Awareness Centers (War Rooms) where every field operation, satellite asset, security perimeter, and intelligence vector is monitored and directed in real-time from a single tactical hub.

Previously, running EOS operations required invoking separate tools across disparate commands (`eos fleet`, `eos loop`, `eos trace`, `eos intake`, `eos orchestrate`). 

This specification establishes the **Joint Operations Tactical Command Center (`JointOperationsCommandCenter`)** (`eos ops` / `eos war-room`), an agency-grade command and control console providing unified fleet surveillance, surgical multi-project dispatching, intelligence dossier synthesis, and cryptographic operation receipts (`OPR-XXXX`).

---

## 2. Architectural Topology

```text
┌─────────────────────────────────────────────────────────────────────────┐
│              EOS JOINT OPERATIONS COMMAND CENTER (WAR ROOM)             │
│                      (eos ops / eos war-room)                           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌───────────────────┐       ┌───────────────────┐       ┌───────────────────┐
│ 1. FLEET RADAR    │       │ 2. TACTICAL       │       │ 3. INTEL DOSSIER  │
│    All registered │       │    DISPATCHER     │       │    Forensic audits│
│    projects grid, │       │    Surgically runs│       │    Engram memory, │
│    lifecycle state│       │    intake, trace, │       │    risk matrices, │
│    & git health   │       │    loop, or audit │       │    attack surfaces│
└─────────┬─────────┘       └─────────┬─────────┘       └─────────┬─────────┘
          │                           │                           │
          └───────────────────────────┼───────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. MULTI-AGENT COUNCIL READINESS & CRYPTOGRAPHIC OPERATION LEDGER       │
│    16 specialist desks posture (Sec, Arch, QA, A11y) + SHA-256 Receipts │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Functional Requirements (EARS Syntax)

* **FR-01 (Event-Driven — Fleet Situational Awareness Aggregation)**:
  CUANDO el operador solicite el estado de la sala de operaciones (`eos ops status` o `eos war-room`), EL SISTEMA escaneará todos los proyectos registrados en `docs/projects/registrations/`, verificará su estado de ciclo de vida (`lifecycle_status`), inspeccionará el estado de git local, computará los recibos de evidencia vigentes y renderizará una matriz táctica unificada.

* **FR-02 (Event-Driven — Surgical Mission Dispatching)**:
  CUANDO el operador despache una acción táctica (`eos ops dispatch --project <id> --action <intake|trace|loop|audit|simplify>`), EL SISTEMA ejecutará el subsistema correspondiente de forma aislada, capturará las métricas de ejecución y generará un recibo de operación inmutable (`OPR-XXXX`) con firma SHA-256.

* **FR-03 (State-Driven — Intelligence Dossier Synthesis)**:
  MIENTRAS se consulte el dossier de inteligencia de un proyecto (`eos ops intel --project <id>`), EL SISTEMA consolidará el perfil de registro, la superficie de ataque, los invariantes arquitectónicos, los hallazgos forenses y las decisiones persistidas en Engram en un único informe táctico estructurado.

* **FR-04 (Ubiquitous / Permanent — Multi-Agent Specialist Council Posture)**:
  EL SISTEMA mantendrá visible el estado de preparación de los 16 escritorios de agentes especialistas (`AGENT_COUNCIL`: Product, Research, Requirements, Spec, Architecture, Implementation, Security, Quality, a11y, Performance, SEO, Browser QA, Testing, Evidence, Governance Audit, Release).

* **FR-05 (Ubiquitous / Permanent — High-Density War Room Terminal Rendering)**:
  EL SISTEMA proporcionará una vista de consola ANSI de alta densidad que resume la postura operacional global, el ratio de verificación de invariantes, la latencia de respuesta y las alertas activas de deriva en menos de 100 milisegundos.

* **FR-06 (Ubiquitous / Permanent — Pure L0 Zero Dependencies)**:
  EL SISTEMA implementará el centro de mando táctico utilizando exclusivamente módulos nativos de Node.js (`node:fs`, `node:path`, `node:crypto`, `node:child_process`).

---

## 4. Acceptance Criteria (BDD / GIVEN-WHEN-THEN)

```gherkin
ESCENARIO 01: Consulta de estado de flota táctica (War Room)
  DADO el directorio de control plane con proyectos registrados
  CUANDO JointOperationsCommandCenter.getFleetTacticalStatus() es ejecutado
  ENTONCES se retorna una lista completa de proyectos con su lifecycle_status
  Y se incluye el total de recibos de evidencia y la postura del Multi-Agent Council

ESCENARIO 02: Despacho quirúrgico de operación sobre proyecto
  DADO un proyecto registrado como 'PRJ-APP-FUERZA' o 'PRJ-SYNTH'
  CUANDO JointOperationsCommandCenter.dispatchSurgicalOperation({ projectId, action: 'trace' }) es invocado
  ENTONCES la acción se ejecuta sin errores fatales
  Y se emite un recibo OPR-XXXX con digest criptográfico SHA-256

ESCENARIO 03: Compilación de dossier de inteligencia táctica
  DADO un proyecto registrado con documentación y contratos
  CUANDO JointOperationsCommandCenter.compileIntelligenceDossier(projectId) es ejecutado
  ENTONCES se genera un objeto de dossier con secciones de perfil, gobernanza, riesgos y evidencia
  Y el dossier posee un hash SHA-256 inmutable

ESCENARIO 04: Renderizado de tablero War Room de alta densidad
  DADO un conjunto de datos tácticos consolidados
  CUANDO JointOperationsCommandCenter.formatWarRoomDashboard(data) es invocado
  ENTONCES la salida de texto contiene los bloques [FLEET SURVEILLANCE], [AGENT COUNCIL READINESS] y [INTELLIGENCE POSTURE]
  Y el tiempo de formateo es menor a 50 milisegundos

ESCENARIO 05: Ejecución CLI unificada
  DADO el binario 'bin/eos.js'
  CUANDO se ejecuta 'node bin/eos.js ops status --json' o 'node bin/eos.js war-room'
  ENTONCES el comando finaliza con código 0 y emite el informe táctico correspondiente
```
