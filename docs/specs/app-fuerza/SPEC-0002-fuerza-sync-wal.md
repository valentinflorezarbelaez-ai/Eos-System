# SPEC-0002: Fuerza Sync WAL — Motor de Sincronización con Write-Ahead Logging

* **Component ID:** `FUE-SYNC-WAL-2026`
* **Status:** `APPROVED_FOR_TDD_IMPLEMENTATION`
* **Target Project:** `PRJ-APP-FUERZA`
* **Path:** `C:\Users\valen\Documents\APP fuerza`
* **Version:** `1.0.0`
* **Traceability Index:** `REQ-FUE-002` -> `EVD-FUE-SYNC-XXXX`
* **Policy:** `L0_NODE_BUILTINS_ONLY` (Core Logic)

---

## 1. Requisitos de Ingeniería (Sintaxis EARS)

- **[REQ-EARS-WAL-01] (Ubiquitous - Append-Only Local First)**:  
  **EL SISTEMA** de sincronización DEBE escribir cada sesión de entrenamiento en el log local en modo *append-only* antes de intentar su transmisión hacia el servidor remoto.

- **[REQ-EARS-WAL-02] (Event-Driven - Sincronización FIFO)**:  
  **WHEN** se confirme conectividad de red disponible,  
  **EL SISTEMA DEBE** procesar los registros pendientes del WAL en orden estrictamente cronológico (FIFO) y marcarlos como `COMMITTED` únicamente tras recibir confirmación exitosa del servidor.

- **[REQ-EARS-WAL-03] (State-Driven - Preservación ante Fallas)**:  
  **WHILE** un registro del WAL no reciba una respuesta HTTP 200 del servidor remoto,  
  **EL SISTEMA DEBE** mantener dicho registro en estado `PENDING_SYNC` en el almacenamiento local para reintento diferido.

- **[REQ-EARS-WAL-04] (Error / Unwanted Condition - Detección de Corrupción de Log)**:  
  **IF** un registro del WAL presenta discrepancia en su checksum SHA-256,  
  **THEN EL SISTEMA DEBE** rechazar el procesamiento y lanzar el error `ERR-FUE-WAL-CORRUPTED`.

---

## 2. Escenarios de Aceptación (Gherkin / BDD)

### Regla de Negocio 01: Persistencia Atómica en el Log Local

```gherkin
Scenario: Registro exitoso de sesión de entrenamiento en el WAL Offline
  Dado que la aplicación se encuentra en modo offline (sin conectividad de red)
  Y el motor de sincronización WAL está inicializado de forma limpia
  Cuando se finaliza una sesión de fuerza con ID "SES-001" y 4 ciclos completados
  Entonces el sistema debe empaquetar los datos y calcular su checksum SHA-256
  Y escribir la entrada al final del archivo de log local con el estado "PENDING_SYNC"
  Y el tamaño de la cola de sincronización pendiente debe incrementarse en exactamente 1
```

### Regla de Negocio 02: Sincronización FIFO y Tolerancia a Fallos de Red

```gherkin
Scenario: Sincronización exitosa de la cola WAL al recuperar conectividad
  Dado un WAL local conteniendo 2 registros con estado "PENDING_SYNC"
  Y el simulador de red cambia a estado online estable
  Cuando el motor ejecuta el proceso de vaciado de la cola (flushWAL)
  Entonces el sistema debe despachar secuencialmente cada registro al servidor remoto
  Y al recibir confirmación de éxito, debe actualizar el estado local a "COMMITTED"
  Y el balance de registros pendientes en la cola WAL debe quedar exactamente en 0
```

---

## 3. Contratos de Datos (Pureza L0)

### 3.1 Estructura de Entrada en el WAL (`WalLogEntry`)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "entryId": { "type": "string" },
    "timestamp": { "type": "string", "format": "date-time" },
    "status": { "type": "string", "enum": ["PENDING_SYNC", "SYNCING", "COMMITTED", "FAILED"] },
    "payload": {
      "type": "object",
      "properties": {
        "sessionId": { "type": "string" },
        "totalCyclesCompleted": { "type": "integer" },
        "durationMs": { "type": "number" }
      },
      "required": ["sessionId", "totalCyclesCompleted", "durationMs"]
    },
    "checksum": { "type": "string" }
  },
  "required": ["entryId", "timestamp", "status", "payload", "checksum"]
}
```
