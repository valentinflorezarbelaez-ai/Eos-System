# Specification — Mission BX: Autonomous Self-Healing Sentinel & FDIR Remediation Engine Port (SPEC-0081)

## 1. Functional Requirements (EARS)

### REQ-EARS-BX-01: Anomaly Ingestion & Incident Registration
- **Event-Driven**: WHEN an anomaly or failure is reported by a sentinel or monitor, THE SYSTEM SHALL validate the incident schema, assign a canonical severity rating, record the incident in the active incident store, transition component health, and seal an incident registration receipt (`BX-RCPT-*`).
- **Error Condition**: IF an incident report lacks a valid `incidentId`, `componentId`, `severity`, or `anomalyType`, THE SYSTEM SHALL DENY registration (`MALFORMED_INCIDENT_DENY`) and emit a sealed receipt.

### REQ-EARS-BX-02: Component Quarantine & Failure Isolation
- **Event-Driven**: WHEN an incident has severity `HIGH` or `CRITICAL`, or quarantine is explicitly requested, THE SYSTEM SHALL transition the component to `QUARANTINED` status, isolate its communication and execution routing, and seal a quarantine receipt (`BX-RCPT-*`).
- **State-Driven**: WHILE a component is in `QUARANTINED` status, THE SYSTEM SHALL reject standard workload dispatches to it until remediation completes or manual release is authorized.

### REQ-EARS-BX-03: Autonomous Remediation & Bounded Retry Policy
- **Event-Driven**: WHEN remediation is triggered for an active incident, THE SYSTEM SHALL verify the remediation strategy (`RESTART`, `ROLLBACK_SNAPSHOT`, `STATE_RESET`, `ISOLATE_CIRCUIT_BREAKER`), check current retry count against `maxRetries` (default 3), execute the remediation action, and seal a remediation receipt (`BX-RCPT-*`).
- **Error Condition**: IF remediation retries reach or exceed `maxRetries`, THE SYSTEM SHALL halt autonomous retries, transition the component to `ESCALATED`, require human-in-the-loop intervention (`ESCALATED_HITL_REQUIRED`), and seal an escalation receipt (`BX-RCPT-*`).

### REQ-EARS-BX-04: Security Screening & Write Barrier Protection
- **Error Condition**: IF any incident report, log payload, or remediation parameter contains plain secrets or vendor key patterns (Law VI), THE SYSTEM SHALL DENY the operation (`SECRET_DETECTED_DENY`) and emit a sealed receipt.
- **Error Condition**: IF any incident target or remediation action points to `Documents/Fundacion`, THE SYSTEM SHALL trigger `FUNDACION_ALWAYS_DENY` and preserve `Fundacion Δ=0`.

### REQ-EARS-BX-05: Cryptographic Receipt Integrity & Trail Custody
- **Ubiquitous**: THE SYSTEM SHALL record every self-healing action, quarantine transition, remediation execution, and escalation in an immutable nine-field cryptographic receipt (`BX-RCPT-*`) chained via `prevReceiptHash` and verified via canonical SHA-256 digests.

---

## 2. Acceptance Criteria (BDD)

```gherkin
ESCENARIO: Registro exitoso de incidente anómalo
  DADO un puerto de autorrecuperación autónoma inicializado
  CUANDO se reporta un incidente con id "inc:001", componentId "agent:compiler", severity "HIGH", y anomalyType "INVARIANT_DRIFT"
  ENTONCES el estado devuelto es "INCIDENT_REGISTERED_OK"
  Y el componente queda en estado "DEGRADED"
  Y se emite un recibo criptográfico con prefijo "BX-RCPT-"

ESCENARIO: Cuarentena inmediata de componente crítico
  DADO un componente reportando fallo crítico
  CUANDO se ejecuta la orden de cuarentena sobre "agent:compiler" con motivo "CRITICAL_DRIFT"
  ENTONCES la respuesta es "COMPONENT_QUARANTINED_OK"
  Y el estado de salud del componente es "QUARANTINED"
  Y se emite un recibo sellado reflejando la cuarentena

ESCENARIO: Ejecución exitosa de remediación autónoma
  DADO un incidente activo con 0 reintentos previos
  CUANDO se ejecuta una acción de remediación de tipo "ROLLBACK_SNAPSHOT" con snapshotId "snap:042"
  ENTONCES la respuesta es "REMEDIATION_SUCCESS_OK"
  Y el incidente queda registrado como resuelto o en remediación
  Y el contador de reintentos se incrementa a 1

ESCENARIO: Escalación a humano (HITL) al superar el límite de reintentos
  DADO un incidente que ya ha alcanzado el límite de 3 reintentos fallidos
  CUANDO se intenta ejecutar una nueva remediación autónoma
  ENTONCES la operación es bloqueada con "ESCALATED_HITL_REQUIRED"
  Y el componente pasa a estado "ESCALATED"
  Y se emite un recibo certificando la escalación

ESCENARIO: Detección y bloqueo de secretos en detalles de incidente (Law VI)
  DADO un reporte de incidente cuyos logs contienen una credencial sintética (sk-...)
  CUANDO el policy gate evalúa el reporte
  ENTONCES la operación es rechazada con código "SECRET_DETECTED_DENY"
  Y el log secreto no se persiste

ESCENARIO: Protección estricta de la barrera Fundacion
  DADO una acción de remediación que intenta escribir en "C:/Users/valen/Documents/Fundacion"
  CUANDO el policy gate evalúa el destino
  ENTONCES la operación es denegada con "FUNDACION_ALWAYS_DENY"
  Y Fundacion mantiene Delta=0
```
