# LIVING SPECIFICATION: MASTER SDD PIPELINE ORCHESTRATOR
**ID de Misión:** `MIS-ORCH-001`  
**Estado:** `VALIDATED`  
**Fecha:** 2026-08-27  

---

## 1. Contexto y Objetivos
El `EOSOrchestrator` es el motor rector de la máquina de estados del Master SDD Pipeline (21 pasos / 5 macrofases canónicas). Conduce de forma restrictiva las transiciones del ciclo de vida, exigiendo firmas de evidencia verificables (`EVD-XXXX.json` o hashes SHA-256) antes de autorizar el avance entre fases y previniendo el código sin especificación formal.

---

## 2. Requerimientos Funcionales en Sintaxis EARS

### [REQ-EARS-ORCH-01] Inicialización Gobernada de Misiones
* **CUANDO** el orquestador recibe la instrucción `inicializarMision` con un identificador y descripción válidos, **EL SISTEMA DEBE** crear la misión en fase `INTAKE`, registrar el nodo en la Ontología de Conocimiento (`MISSION`), firmar la transacción en el Ledger y retornar el estado bajo `PERFECT_EXECUTION`.

### [REQ-EARS-ORCH-02] Autorización de Compuerta con Evidencia Válida
* **CUANDO** el orquestador recibe una solicitud de `avanzarFase` acompañada de un hash criptográfico de evidencia válido (`sha256-...` o hash SHA-256 de 64 caracteres), **EL SISTEMA DEBE** validar la evidencia, avanzar a la siguiente fase canónica (`SPECIFICATION`, `ARCHITECTURE_PLAN`, `IMPLEMENTATION_TDD`, `VERIFICATION`), sellar el cambio en el Ledger y retornar `GATE_AUTHORIZED`.

### [REQ-EARS-ORCH-03] Bloqueo ante Evidencia Ausente o Corrupta
* **SI** se intenta avanzar de fase sin evidencia válida o con un formato criptográfico corrupto, **ENTONCES EL SISTEMA DEBE** lanzar la violación `GATE_VALIDATION_FAILED`, interceptada por el `EOSProcessGovernor` con estado `REJECTED_BY_GOVERNANCE`.

### [REQ-EARS-ORCH-04] Validación Estricta de Gates de Implementación
* **CUANDO** se invoca `validarGateImplementacion` para auditar la transición hacia `src/`, **EL SISTEMA DEBE** verificar la concordancia exacta entre el hash esperado y el documento de evidencia presentado.

---

## 3. Criterios de Aceptación BDD (GIVEN-WHEN-THEN)

```gherkin
ESCENARIO: Inicialización y avance nominal en el pipeline
  DADO que se inicializa una misión "MIS-AUTH-001" en fase "INTAKE"
  CUANDO se presenta un hash de evidencia válido
  ENTONCES la misión avanza a la fase "SPECIFICATION" con estado "GATE_AUTHORIZED"
  Y el evento queda registrado en el Ledger inmutable

ESCENARIO: Intento fraudulento de transición sin evidencia
  DADO una misión activa en fase "INTAKE"
  CUANDO se intenta invocar "avanzarFase" con un hash no conforme
  ENTONCES la compuerta es bloqueada bajo "REJECTED_BY_GOVERNANCE"
  Y la misión permanece inmutable en su fase anterior
```
