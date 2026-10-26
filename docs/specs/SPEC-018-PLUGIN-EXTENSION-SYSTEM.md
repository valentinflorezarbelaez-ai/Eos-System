# SPEC-018: Plugin & Extension System

## Milestone ID: `SPEC-018-PLUGIN-SYSTEM`
## Status: APPROVED
## Date: 2026-10-25

---

## 1. Functional Requirements (EARS Syntax)

### FR-018-01: Plugin Manifest Formalization (Event-Driven)
WHEN a plugin author registers a plugin,
THE SYSTEM SHALL instantiate an immutable `PluginManifest` entity defining `name`, `version` (SemVer 2.0.0), `description`, `author`, `entrypoint`, `capabilities`, `dependencies`, and `hooks`.

### FR-018-02: Manifest SemVer Validation (Ubiquitous)
THE SYSTEM SHALL reject any plugin manifest with an invalid Semantic Version string or empty required fields.

### FR-018-03: Lifecycle Hook Registration (State-Driven)
WHILE a plugin is active in the `PluginManager`,
THE SYSTEM SHALL allow registration of callbacks for four lifecycle events: `onInit`, `preStep`, `postStep`, and `onDestroy`.

### FR-018-04: Hook Dispatch Execution (Event-Driven)
WHEN a pipeline step executes,
THE SYSTEM SHALL trigger all registered `preStep` hooks before step invocation and all `postStep` hooks with step results upon completion.

### FR-018-05: Plugin Isolation & Error Sandboxing (Error / Unwanted Condition)
IF a plugin hook throws an unhandled exception during pipeline execution,
THEN THE SYSTEM SHALL catch the error, log a structured `WARN` event to the `TelemetryPipeline`, and continue pipeline execution without crashing the core engine.

### FR-018-06: CLI Plugin Management (Event-Driven)
WHEN the operator runs `eos plugin list` or `eos plugin create <name>`,
THE SYSTEM SHALL display loaded plugins or scaffold a valid plugin template directory.

---

## 2. Acceptance Criteria (BDD Syntax)

```gherkin
ESCENARIO: Validación e instanciación de un manifiesto de plugin
  DADO un nombre "eos-slack-notifier", versión "1.0.0" y hooks válidos
  CUANDO se invoca PluginManifest.create()
  ENTONCES el objeto resultante es inmutable (Object.isFrozen === true)
  Y contiene la lista de hooks y capacidades declaradas

ESCENARIO: Registro y ejecución de hooks de ciclo de vida
  DADO un PluginManager con un plugin registrado que escucha "preStep" y "postStep"
  CUANDO el orquestador o gestor despacha un evento preStep
  ENTONCES el callback del plugin es ejecutado con los metadatos del paso

ESCENARIO: Contención de fallos en hooks de plugins (Sandboxing)
  DADO un plugin defectuoso cuyo hook arroja una excepción
  CUANDO el PluginManager despacha el hook
  ENTONCES el fallo es capturado sin abortar la ejecución del pipeline principal
```

---

## 3. Non-Functional Requirements (NFR)

### NFR-018-01: Pure Domain Isolation
`src/core/domain/models/PluginManifest.ts` must contain zero external dependencies and zero Node.js I/O imports (`fs`, `path`, `http`).

### NFR-018-02: Zero Plain Secrets
Plugins must not embed plain API tokens; all external authentication must reference environment profiles.
