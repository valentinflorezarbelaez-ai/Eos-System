# LIVING SPECIFICATION: MISSION ONTOLOGY CORE & EXPLAINABILITY LOG
**ID de Misión:** `MIS-ONT-CORE-001`
**Estado:** `VALIDATED_LOCAL_CANARY`

## 1. Patrones de Requisitos (Sintaxis EARS)

- **[REQ-EARS-MOC-01] (Event-Driven - Mandatory Explainability)**:
  **CUANDO** la autoridad emita una decisión o cambie el estado de un contrato, **EL SISTEMA DEBE** forzar la inclusión de un bloque de transparencia que declare explícitamente: opciones consideradas (`optionsConsidered`), justificación racional (`why`) y nivel de confianza estadística/lógica (`confidence`).

- **[REQ-EARS-MOC-02] (Error-Condition - Chain Integrity Enforcement)**:
  **SI** el objeto de misión resultante no contiene la cadena completa hasheada (Intent ➔ Contract ➔ Authority ➔ Evidence ➔ Outcome), **ENTONCES EL SISTEMA DEBE** lanzar un pánico síncrono e impedir su persistencia en el registro inmutable.

---

## 2. Criterios de Aceptación (BDD / Gherkin)

```gherkin
ESCENARIO: Sello criptográfico exitoso con bitácora de transparencia
  DADO un payload previo con intentId y contractHash
  CUANDO la autoridad somete una decisión con optionsConsidered, why (>= 10 chars) y confidence [0.0 - 1.0]
  ENTONCES el bloque es sellado con missionChainHash (sha256-...)
  Y el registro de justificación queda inmutablemente anexado

ESCENARIO: Rechazo de decisión opaca por falta de justificación
  DADO un payload previo válido
  CUANDO la autoridad somete una justificación con menos de 10 caracteres o confidence fuera de rango
  ENTONCES el sistema arroja GOVERNANCE FAULT
  Y la transacción es rechazada sin mutación de estado
```
