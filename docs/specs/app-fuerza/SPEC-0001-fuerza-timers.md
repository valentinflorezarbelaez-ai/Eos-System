# SPEC-0001: Fuerza Timers — Motor de Intervalos de Alta Precisión Offline-First

* **Component ID:** `FUE-TIME-2026`
* **Status:** `APPROVED_FOR_TDD_IMPLEMENTATION`
* **Target Project:** `PRJ-APP-FUERZA`
* **Path:** `C:\Users\valen\Documents\APP fuerza`
* **Version:** `1.0.0`
* **Traceability Index:** `REQ-FUE-001` -> `EVD-FUE-TIME-XXXX`
* **Policy:** `L0_NODE_BUILTINS_ONLY` (Core Logic)

---

## 1. Requisitos de Ingeniería (Sintaxis EARS)

- **[REQ-EARS-TIME-01] (Ubiquitous - Cálculo por Target Timestamp Absoluto)**:  
  **EL SISTEMA** de temporizadores DEBE calcular el tiempo restante comparando el timestamp de alta resolución actual (`Date.now()`) contra un `targetTimestamp` absoluto prefijado para mitigar la deriva temporal acumulada por el throttling del event loop.

- **[REQ-EARS-TIME-02] (State-Driven - Emisión de Telemetría)**:  
  **WHILE** la máquina de estados de entrenamiento se encuentre en estado `WORK` o `REST`,  
  **EL SISTEMA DEBE** emitir pulsos de actualización de estado conteniendo la telemetría exacta en cada tick de control.

- **[REQ-EARS-TIME-03] (Event-Driven - Transición Automática & Disparo de Vibración)**:  
  **WHEN** el contador de tiempo remanente del estado actual llegue a cero o menor,  
  **EL SISTEMA DEBE** realizar la transición secuencial automática (`WORK ➔ REST` o `REST ➔ WORK` / `COMPLETE`) y activar el flag de vibración del hardware móvil (`isHardwareVibrationTriggered: true`).

- **[REQ-EARS-TIME-04] (Error / Unwanted Condition - Duración Inválida de Intervalos)**:  
  **IF** la configuración de ciclo contiene duraciones de trabajo, descanso o ciclos menores o iguales a cero,  
  **THEN EL SISTEMA DEBE** rechazar la inicialización con el error `ERR-FUE-INVALID-TIMER-DURATION`.

---

## 2. Escenarios de Aceptación (Gherkin / BDD)

### Regla de Negocio 01: Transición de Estados del Ciclo de Fuerza

```gherkin
Scenario: Ejecución de ciclo de entrenamiento y transición fluida de intervalos
  Dado que el motor de intervalos de App Fuerza está inicializado correctamente en estado "IDLE"
  Y se configura un ciclo con 40000ms de trabajo y 20000ms de descanso para 2 ciclos
  Cuando se envía el comando de control "START_TIMER"
  Entonces la máquina debe cambiar su estado inmediatamente a "WORK"
  Y al avanzar el reloj el tiempo asignado de trabajo, el motor debe transicionar automáticamente a "REST"
  Y el sistema debe marcar el flag de vibración del hardware activo con un pulso largo.
```

### Regla de Negocio 02: Resiliencia a la Suspensión del Hilo Principal (Background Protection)

```gherkin
Scenario: Recuperación automática del delta temporal tras congelamiento de pestaña
  Dado que el temporizador está corriendo activamente en estado "WORK" con un tiempo de finalización fijo
  Y el navegador congela el hilo de ejecución JavaScript durante 5000ms debido al paso de la app a segundo plano
  Cuando el hilo de ejecución se reanuda y procesa el siguiente tick de control
  Entonces el sistema debe calcular la diferencia real de tiempo transcurrido contra el reloj del sistema
  Y deducir los 5000ms instantáneamente del temporizador para evitar derivas o retardos acumulados.
```

---

## 3. Contratos de Datos (Pureza L0)

### 3.1 Esquema de Entrada de Configuración del Ciclo (`TimerConfigInput`)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "workDurationMs": { "type": "number", "minimum": 100 },
    "restDurationMs": { "type": "number", "minimum": 100 },
    "totalCycles": { "type": "integer", "minimum": 1 }
  },
  "required": ["workDurationMs", "restDurationMs", "totalCycles"],
  "additionalProperties": false
}
```

### 3.2 Esquema del Estado del Motor (`TimerStateOutput`)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "currentState": { "type": "string", "enum": ["IDLE", "WORK", "REST", "PAUSED", "COMPLETE"] },
    "currentCycle": { "type": "integer", "minimum": 1 },
    "totalCycles": { "type": "integer", "minimum": 1 },
    "timeRemainingMs": { "type": "number", "minimum": 0 },
    "targetTimestamp": { "type": ["number", "null"] },
    "isHardwareVibrationTriggered": { "type": "boolean" }
  },
  "required": ["currentState", "currentCycle", "totalCycles", "timeRemainingMs", "isHardwareVibrationTriggered"]
}
```
