# SPECIFICATION: SPEC-010
## Production-Ready RAG & Multi-Agent IT Project Effort & Cost Estimation Engine

---

### 1. Specification Metadata
* **Specification ID:** `SPEC-010`
* **Parent Intake:** `INTAKE-010`
* **Status:** `SPECIFICATION_APPROVED`
* **Standard:** IEEE 830 / ISO 29148 / EARS / BDD
* **Authorizer:** Lead Architect & System Owner
* **Timestamp:** 2026-10-25T13:08:00-05:00

---

### 2. Functional Requirements (EARS Syntax)

#### FR-001 (Ubiquitous): WBS Decomposition & Query Preprocessing
* `EL SISTEMA` normalizará de forma continua los acrónimos tecnológicos (JWT, OAuth, CI/CD, PWA, etc.) y descompondrá cualquier descripción de proyecto de software en bloques de trabajo WBS (Work Breakdown Structure) con tareas granulares identificables.

#### FR-002 (Event-Driven): Per-Task Parallel Semantic Retrieval
* `CUANDO` el operador o el motor solicite la estimación de un proyecto IT, `EL SISTEMA` ejecutará búsquedas semánticas vectoriales concurrentes por cada tarea individual contra el índice histórico, extrayendo las horas históricas normalizadas ($1\text{ día} = 8\text{ horas}$) y descartando coincidencias con similitud de coseno inferior a 0.60.

#### FR-003 (State-Driven): Multi-Factor Confidence Evaluation
* `MIENTRAS` se evalúen las referencias históricas recuperadas, `EL SISTEMA` calculará un índice compuesto de confianza basado en cuatro factores matemáticos: volumen de referencias, promedio de similitud semántica, coincidencia de stack tecnológico y varianza histórica de costes/horas.

#### FR-004 (Event-Driven): Tri-Point PERT Effort & Seniority Costing
* `CUANDO` se consoliden las horas históricas y la complejidad técnica de las tareas, `EL SISTEMA` calculará la distribución PERT de esfuerzo ($T_e = \frac{O + 4M + P}{6}$ y desviación estándar $\sigma = \frac{P - O}{6}$) y derivará el presupuesto financiero desglosado por perfiles de seniority (Tech Lead, Senior Dev, Mid Dev, QA, DevOps).

#### FR-005 (State-Driven): Multi-Agent Risk & Scope Outlier Detection
* `MIENTRAS` el pipeline de estimación consolide el resultado, `EL SISTEMA` ejecutará un agente auditor adversarial que identificará omisiones de requerimientos técnicos no funcionales (seguridad, auditoría, migración, respaldo, monitoreo) y ajustará el búfer de contingencia acorde a la complejidad.

#### FR-006 (Ubiquitous): Cryptographic Evidence & Strict Attestation
* `EL SISTEMA` emitirá una atestación criptográfica SHA-256 por cada estimación generada y garantizará 0 dependencias externas en tiempo de ejecución en la Capa 0 de Dominio.

---

### 3. Acceptance Criteria (BDD)

```gherkin
ESCENARIO: SCENARIO-01 - Descomposición WBS y Normalización de Consultas
  DADO un texto de requerimiento "Crear app con autenticacion OAuth, backend REST y base de datos postgres"
  CUANDO el procesador de consultas ejecuta la normalización
  ENTONCES los términos se expanden canónicamente a "OAuth (Open Authorization)", "REST", "PostgreSQL"
  Y se generan al menos 3 bloques WBS (Autenticación, API Backend, Capa de Datos).

ESCENARIO: SCENARIO-02 - Cálculo de Confianza Multi-Factor
  DADO un conjunto de chunks recuperados con similitud promedio de 0.85, 8 referencias y 100% coincidencia técnica
  CUANDO el motor de confianza evalúa los factores
  ENTONCES el score de confianza es superior a 0.80
  Y el nivel de confianza asignado es "HIGH".

ESCENARIO: SCENARIO-03 - Estimación PERT y Coste por Seniority
  DADO un proyecto WBS de 100 horas estimadas más probables (M), con optimista (O) de 80h y pesimista (P) de 140h
  CUANDO se aplica la distribución beta de PERT
  ENTONCES el esfuerzo esperado Te es 103.33 horas
  Y el coste total refleja la ponderación de tarifas horarias según los perfiles asignados.
```

---

### 4. Non-Functional Requirements (NFR)
1. **Performance**: La descomposición WBS y cálculo PERT debe resolverse en $< 100$ ms en entorno local.
2. **Mathematical Accuracy**: Fórmulas de PERT y varianza estadística conformes a IEEE / PMBOK 7th Edition.
3. **Auditability**: Cada estimación debe contener trazabilidad completa hasta los chunks y supuestos de cálculo.
4. **Hermeticity**: 0 dependencias externas de runtime en Layer 0 (Node stdlib únicamente).
