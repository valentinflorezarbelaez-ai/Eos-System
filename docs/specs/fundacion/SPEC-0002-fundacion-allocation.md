# SPEC-0002: Fundación Allocation — Asignación de Fondos y Auditoría Pública

* **Component ID:** `FUN-ALLOC-2026`
* **Status:** `APPROVED_FOR_TDD_IMPLEMENTATION`
* **Target Project:** `PRJ-FUNDACION`
* **Path:** `C:\Users\valen\Documents\Fundacion`
* **Version:** `1.0.0`
* **Traceability Index:** `REQ-FUN-002` -> `EVD-FUN-ALLOC-XXXX`
* **Policy:** `L0_NODE_BUILTINS_ONLY` (Core Logic)

---

## 1. Requisitos de Ingeniería (Sintaxis EARS)

- **[REQ-EARS-ALLOC-01] (Ubiquitous - Asignación Trazable)**:  
  **EL SISTEMA** de asignación DEBE registrar cada distribución de capital asociándola a un proyecto destino válido y emitiendo un identificador único de asignación con timestamp ISO-8601.

- **[REQ-EARS-ALLOC-02] (Error / Unwanted Condition - Límite de Fondos Disponibles)**:  
  **IF** el monto a asignar supera el saldo disponible acumulado en el ledger de donaciones para ese proyecto,  
  **THEN EL SISTEMA DEBE** bloquear la transacción y lanzar una excepción con código `ERR-FUN-INSUFFICIENT-PROJECT-FUNDS`.

- **[REQ-EARS-ALLOC-03] (Event-Driven - Reporte de Transparencia y Auditoría Pública)**:  
  **WHEN** se solicite un reporte de auditoría pública consolidado,  
  **EL SISTEMA DEBE** calcular en tiempo real el balance (`totalDonated`, `totalAllocated`, `netBalance`) por cada proyecto registrado.

- **[REQ-EARS-ALLOC-04] (Error / Unwanted Condition - Monto Inválido de Asignación)**:  
  **IF** el monto a asignar es menor o igual a cero,  
  **THEN EL SISTEMA DEBE** rechazar la operación con código `ERR-FUN-INVALID-ALLOCATION-AMOUNT`.

---

## 2. Escenarios de Aceptación (Gherkin / BDD)

### Regla de Negocio 01: Asignación Consistente de Fondos

```gherkin
Scenario: Asignación exitosa de capital a un proyecto con saldo disponible
  Dado que el Core de la Fundación tiene registradas donaciones por 5000 para "PROY-REFORESTACION"
  Y el módulo de asignación está inicializado de forma limpia
  Cuando se asignan 2000 al proyecto "PROY-REFORESTACION" con el propósito "Compra de 500 plantones"
  Entonces el sistema debe aprobar la transacción con estado "ALLOCATED"
  Y el saldo disponible restante para "PROY-REFORESTACION" debe ser exactamente 3000

Scenario: Rechazo de asignación por fondos insuficientes (Límite Financiero)
  Dado que el Core de la Fundación solo tiene 5000 donados para "PROY-REFORESTACION"
  Cuando se intenta asignar 6000 al proyecto "PROY-REFORESTACION"
  Entonces el sistema debe bloquear la transacción inmediatamente
  Y lanzar una excepción con el código "ERR-FUN-INSUFFICIENT-PROJECT-FUNDS"
  Y el saldo disponible del proyecto debe mantenerse intacto en 5000
```

### Regla de Negocio 02: Auditoría Pública y Transparencia

```gherkin
Scenario: Generación de reporte de balance consolidado para auditoría pública
  Dado que se han recibido donaciones por 10000 para "PROY-EDUCACION"
  Y se han asignado 4000 para "Becas Universitarias"
  Cuando el público solicita el reporte de balance de la fundación
  Entonces el sistema debe retornar una matriz con el estado de todos los proyectos
  Y para "PROY-EDUCACION" el campo totalDonated debe ser 10000
  Y el campo totalAllocated debe ser 4000
  Y el campo netBalance debe ser exactamente 6000
```

---

## 3. Contratos de Datos (Pureza L0)

### 3.1 Estructura de Asignación (`AllocationInput`)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "projectId": { "type": "string", "enum": ["PROY-REFORESTACION", "PROY-EDUCACION", "PROY-AGUA"] },
    "amountToAllocate": { "type": "number", "minimum": 0.01 },
    "purpose": { "type": "string", "minLength": 3 }
  },
  "required": ["projectId", "amountToAllocate", "purpose"],
  "additionalProperties": false
}
```

### 3.2 Reporte de Auditoría Pública (`PublicAuditReport`)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "timestamp": { "type": "string", "format": "date-time" },
    "projects": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "totalDonated": { "type": "number" },
          "totalAllocated": { "type": "number" },
          "netBalance": { "type": "number" }
        },
        "required": ["totalDonated", "totalAllocated", "netBalance"]
      }
    }
  },
  "required": ["timestamp", "projects"]
}
```
