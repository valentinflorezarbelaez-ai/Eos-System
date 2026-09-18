# Specification — Mission BY: Autonomous EARS/BDD Spec Synthesizer & Verification Compiler Port (SPEC-0082)

## 1. Functional Requirements (EARS)

### REQ-EARS-BY-01: Goal Ingestion & Schema Validation
- **Event-Driven**: WHEN an operator or agent submits a functional goal to the synthesizer, THE SYSTEM SHALL validate the goal schema, ensure non-empty objective and title, compute the canonical goal digest, and seal an ingestion receipt (`BY-RCPT-*`).
- **Error Condition**: IF a goal lacks a valid `goalId`, `title`, or `objective`, THE SYSTEM SHALL DENY compilation (`MALFORMED_GOAL_DENY`) and emit a sealed receipt.

### REQ-EARS-BY-02: Formal EARS Requirement Synthesis
- **Event-Driven**: WHEN a validated goal is compiled, THE SYSTEM SHALL derive functional requirements matching strictly one of the 4 formal EARS patterns (Event-Driven, State-Driven, Error/Unwanted, Ubiquitous) and ensure zero ambiguous keywords (`maybe`, `might`, `as fast as possible`).
- **Error Condition**: IF any synthesized requirement fails EARS pattern matching or contains ambiguous terminology, THE SYSTEM SHALL DENY compilation (`INVALID_EARS_SYNTAX_DENY`) and emit a sealed receipt.

### REQ-EARS-BY-03: Gherkin BDD Scenario Generation
- **Event-Driven**: WHEN EARS requirements are compiled, THE SYSTEM SHALL generate corresponding Gherkin BDD scenarios containing explicit `GIVEN`, `WHEN`, `THEN`, and `AND` clauses linking directly to requirement identifiers.
- **Error Condition**: IF any BDD scenario lacks a valid `GIVEN`, `WHEN`, or `THEN` clause, THE SYSTEM SHALL DENY compilation (`INVALID_BDD_SYNTAX_DENY`) and emit a sealed receipt.

### REQ-EARS-BY-04: Security Screening & Write Barrier Protection
- **Error Condition**: IF any input text, synthesized requirement, or BDD scenario contains plain credentials or vendor key patterns (Law VI), THE SYSTEM SHALL DENY the compilation (`SECRET_DETECTED_DENY`) and emit a sealed receipt.
- **Error Condition**: IF any goal target or generated path references `Documents/Fundacion`, THE SYSTEM SHALL trigger `FUNDACION_ALWAYS_DENY` and preserve `Fundacion Δ=0`.

### REQ-EARS-BY-05: Cryptographic Receipt Custody & Trail Verification
- **Ubiquitous**: THE SYSTEM SHALL record all specification compilation operations into immutable nine-field cryptographic receipts (`BY-RCPT-*`) chained via `prevReceiptHash` and verified via canonical SHA-256 digests.

---

## 2. Acceptance Criteria (BDD)

```gherkin
ESCENARIO: Compilación exitosa de objetivo a especificación EARS y BDD
  DADO un compilador de especificaciones inicializado
  CUANDO se envía un objetivo con goalId "goal:auth", title "User Authentication", y objective "Authenticate users via JWT"
  ENTONCES la respuesta es "SPEC_COMPILED_OK"
  Y se generan requerimientos EARS con patrones válidos
  Y se generan escenarios BDD con cláusulas GIVEN, WHEN, THEN
  Y se emite un recibo sellado con prefijo "BY-RCPT-"

ESCENARIO: Rechazo de objetivo malformado
  DADO un compilador de especificaciones inicializado
  CUANDO se intenta compilar un objetivo sin título ni objetivo
  ENTONCES la operación es rechazada con "MALFORMED_GOAL_DENY"
  Y se emite un recibo con status "DENIED"

ESCENARIO: Rechazo de requerimiento con sintaxis EARS inválida
  DADO un requerimiento que no sigue ningún patrón formal EARS
  CUANDO el policy gate evalúa el texto del requerimiento
  ENTONCES la validación falla con código "INVALID_EARS_SYNTAX_DENY"

ESCENARIO: Detección y bloqueo de secretos en objetivo (Law VI)
  DADO un objetivo cuyo contexto incluye una API key sintética (sk-...)
  CUANDO el policy gate evalúa el contenido
  ENTONCES la compilación es denegada con "SECRET_DETECTED_DENY"
  Y ninguna clave queda registrada en la especificación

ESCENARIO: Protección de la barrera de escritura Fundacion
  DADO un objetivo que define como target "C:/Users/valen/Documents/Fundacion/spec"
  CUANDO el policy gate evalúa la ruta
  ENTONCES la operación es denegada con "FUNDACION_ALWAYS_DENY"
  Y Fundacion mantiene Delta=0
```
