# Specification — Mission DR: Deterministic Autonomous Execution Loop Controller Port (SPEC-0128)

## 1. Functional Requirements (EARS)

### FR-01: Deterministic Lifecycle Transitions (Ubiquitous)
EL SISTEMA garantizará que las transiciones de ciclo de vida sigan estrictamente la secuencia 7-fases: `INTAKE` ➔ `SPEC_APPROVAL` ➔ `TDD_RED` ➔ `TDD_GREEN` ➔ `QUALITY_AUDIT` ➔ `VERIFIED` ➔ `SEALED`.

### FR-02: Quality Gate for Verification (Event-Driven)
CUANDO un plan solicite una transición hacia el estado `VERIFIED`, EL SISTEMA exigirá que `allChecksPassed === true`, denegando fail-closed con `CHECKS_FAILED_FOR_VERIFIED` si no se cumple.

### FR-03: Layer 0 Purity (Ubiquitous)
EL SISTEMA garantizará que el controlador de ciclo de ejecución no dependa de bibliotecas externas npm (`NODE_BUILTINS_ONLY`).

### FR-04: Write Barrier Protection (Ubiquitous)
EL SISTEMA denegará de manera fail-closed cualquier intento de escritura o redirección hacia rutas de Fundacion (`FUNDACION_ALWAYS_DENY`, Δ=0).

### FR-05: Credential Security (Ubiquitous)
EL SISTEMA denegará cualquier plan o recibo que contenga tokens o credenciales sensibles en texto plano (Law VI).

## 2. BDD Acceptance Criteria

```gherkin
ESCENARIO: Transición secuencial válida de ciclo de ejecución en modo ACTIVE
  DADO un plan con planId, changeId y un loopReport con fromState: "INTAKE" y toState: "SPEC_APPROVAL"
  CUANDO el ExecutionLoopControllerPort ejecuta govern() en modo ACTIVE
  ENTONCES el resultado es PASS
  Y se emite un recibo DR-RCPT-* sellado con loopDigest válido
  Y el recibo preserva productionReady: "NO" y fundacionDelta: 0

ESCENARIO: Denegación por salto no determinista de ciclo
  DADO un plan con un loopReport con fromState: "INTAKE" y toState: "VERIFIED"
  CUANDO el ExecutionLoopControllerPort ejecuta govern()
  ENTONCES el resultado es DENY con código INVALID_LIFECYCLE_TRANSITION
  Y no se emite ningún recibo con decisión PASS
```
