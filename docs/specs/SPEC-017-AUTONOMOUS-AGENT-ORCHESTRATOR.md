# SPEC-017: Autonomous Agent Orchestrator & LLM Integration Engine

## Milestone ID: `SPEC-017-AGENT-ORCHESTRATOR`
## Status: APPROVED
## Date: 2026-10-25

---

## 1. Functional Requirements (EARS Syntax)

### FR-017-01: Agent Capability Declaration (Event-Driven)
WHEN a developer or system module registers an agent capability,
THE SYSTEM SHALL instantiate an immutable `AgentCapability` entity validating unique identifier, persona designation, required input contracts, expected output artifacts, and risk level (`LOW` | `MEDIUM` | `HIGH` | `CRITICAL`).

### FR-017-02: Persona Matrix Assignment (Ubiquitous)
THE SYSTEM SHALL assign each pipeline execution step to a specialized persona selected from: `ARCHITECT`, `SECURITY_AUDITOR`, `PERFORMANCE_ENGINEER`, `PRODUCT_ESTIMATOR`, `CORE_IMPLEMENTER`, and `QA_LEAD`.

### FR-017-03: Provider Abstraction Decoupling (Ubiquitous)
THE SYSTEM SHALL execute LLM interactions exclusively through an abstract `ILLMProvider` interface, allowing hot-swapping between `mock`, `gemini`, and `claude` providers without modifying core orchestration logic.

### FR-017-04: Pipeline Step Dispatch (Event-Driven)
WHEN an autonomous pipeline run is dispatched with a target scope and step sequence,
THE SYSTEM SHALL iterate through the steps sequentially, passing the previous step output context to the next step persona.

### FR-017-05: Step Invariant Assertion (State-Driven)
WHILE a pipeline step is executing,
THE SYSTEM SHALL capture the step duration, model tokens consumed, reasoning trace, and produced output, marking the step status as `COMPLETED` if validation rules pass or `FAILED` if invariants are violated.

### FR-017-06: Telemetry Event Emission (Event-Driven)
WHEN any agent step transitions status (dispatched, thinking, completed, failed),
THE SYSTEM SHALL emit a structured `TelemetryEvent` to the `TelemetryPipeline` with correlation ID preservation.

### FR-017-07: Mock Provider Determinism (State-Driven)
WHILE running under test or offline environments (`profile === 'test'`),
THE SYSTEM SHALL utilize `MockLLMProvider` which generates deterministic, reproducible responses with zero network I/O.

### FR-017-08: CLI Agent Management (Event-Driven)
WHEN the operator executes `eos agent run "<goal>"`, `eos agent status`, or `eos agent capabilities`,
THE SYSTEM SHALL execute the requested agent orchestration command and report formatted execution metrics to stdout.

---

## 2. Acceptance Criteria (BDD Syntax)

```gherkin
ESCENARIO: Declaración y validación de una capacidad de agente
  DADO un identificador único "CAP-SPEC-EARS", una persona "ARCHITECT" y contratos de entrada válidos
  CUANDO se invoca AgentCapability.create()
  ENTONCES el objeto es inmutable (Object.isFrozen === true)
  Y contiene los tipos de entrada y salida esperados

ESCENARIO: Ejecución secuencial determinista con MockLLMProvider
  DADO un orquestador configurado con MockLLMProvider y 3 pasos de pipeline
  CUANDO se ejecuta orchestrator.executePipeline("Refactor domain entities")
  ENTONCES los 3 pasos finalizan con estado "COMPLETED"
  Y el resultado contiene un executionId y un resumen de trazas de razonamiento

ESCENARIO: Captura de fallo de validación en paso de pipeline
  DADO un paso de pipeline donde el proveedor LLM devuelve una respuesta malformada
  CUANDO el orquestador valida la salida contra el contrato de la capacidad
  ENTONCES el paso se marca como "FAILED"
  Y la ejecución se detiene sin proceder al siguiente paso dependiente
```

---

## 3. Non-Functional Requirements (NFR)

### NFR-017-01: Pure Domain Isolation
`src/core/domain/models/AgentCapability.ts` must contain zero external dependencies and zero Node.js I/O imports (`fs`, `path`, `http`).

### NFR-017-02: Zero Plain Secrets
LLM providers must read credentials via `EnvironmentConfig` references without logging or storing raw API keys in plain text.

### NFR-017-03: Execution Performance
Local step evaluation with Mock provider must complete in under 50ms per step.
