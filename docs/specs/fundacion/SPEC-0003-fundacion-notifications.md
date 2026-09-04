# SPEC-0003: Fundación Notifications — Conectores y Webhooks Autónomos

* **Component ID:** `FUN-NOTIF-2026`
* **Status:** `APPROVED_FOR_TDD_IMPLEMENTATION`
* **Target Project:** `PRJ-FUNDACION`
* **Path:** `C:\Users\valen\Documents\Fundacion`
* **Version:** `1.0.0`
* **Traceability Index:** `REQ-FUN-003` -> `EVD-FUN-NOTIF-XXXX`
* **Policy:** `L0_NODE_BUILTINS_ONLY` (Core Logic)

---

## 1. Requisitos de Ingeniería (Sintaxis EARS)

- **[REQ-EARS-NOTIF-01] (Event-Driven - Disparo Inmediato)**:  
  **WHEN** una asignación de fondos sea consagrada exitosamente,  
  **EL SISTEMA DEBE** despachar un webhook inmediato al endpoint registrado del donante original.

- **[REQ-EARS-NOTIF-02] (Ubiquitous - Firma HMAC-SHA256)**:  
  **EL SISTEMA DEBE** firmar cada payload de notificación con `HMAC-SHA256` utilizando la clave secreta del donante, inyectando el header `X-EOS-Signature`.

- **[REQ-EARS-NOTIF-03] (Ubiquitous - Contenido de Verificabilidad)**:  
  **EL SISTEMA DEBE** incluir en la carga útil el `txId` de la donación, el `allocationId`, el monto asignado, el propósito y el digest criptográfico del ledger.

- **[REQ-EARS-NOTIF-04] (State-Driven - Tolerancia a Fallas & Retry Bounded)**:  
  **WHILE** el endpoint receptor retorne un código de error o no responda,  
  **EL SISTEMA DEBE** reintentar el despacho hasta un máximo de 3 intentos antes de marcar el estado en el log como `FAILED_MAX_RETRIES` sin interrumpir el flujo principal.

---

## 2. Escenarios de Aceptación (Gherkin / BDD)

### Regla de Negocio 01: Despacho y Firma Segura de Webhooks

```gherkin
Scenario: Despacho exitoso de notificación con firma criptográfica válida
  Dado que el Core de la Fundación procesó la asignación "ALC-7ECD56A" para el donante "DON-ALFA"
  Y el donante "DON-ALFA" tiene configurado el webhook "https://alfa.com/webhook" con el secreto "sec-123"
  Cuando el servicio de notificaciones procesa el evento de asignación
  Entonces el despachador debe emitir un envío con el payload de impacto
  Y el header 'X-EOS-Signature' debe coincidir exactamente con el HMAC-SHA256 calculado
  Y el estado del despacho debe ser "DISPATCHED"
```

### Regla de Negocio 02: Resiliencia ante Fallas del Receptor (Fault Tolerance)

```gherkin
Scenario: Activación de la política de reintentos ante caída del receptor
  Dado que el endpoint de un donante retorna un código de error HTTP 500
  Cuando el despachador de webhooks intenta enviar la notificación
  Entonces el sistema debe reintentar hasta un máximo de 3 veces
  Y tras el tercer fallo debe suspender reintentos
  Y registrar el estado final en el log como "FAILED_MAX_RETRIES"
  Y no debe lanzar excepción no controlada que congele el flujo de EOS
```

---

## 3. Contratos de Datos (Pureza L0)

### 3.1 Estructura del Payload del Webhook (`NotificationWebhookPayload`)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "eventId": { "type": "string" },
    "donorId": { "type": "string" },
    "timestamp": { "type": "string", "format": "date-time" },
    "impact": {
      "type": "object",
      "properties": {
        "allocationId": { "type": "string" },
        "project": { "type": "string" },
        "amountAllocated": { "type": "number" },
        "purpose": { "type": "string" }
      },
      "required": ["allocationId", "project", "amountAllocated", "purpose"]
    },
    "verification": {
      "type": "object",
      "properties": {
        "donationTxId": { "type": "string" },
        "ledgerDigest": { "type": "string" }
      },
      "required": ["donationTxId", "ledgerDigest"]
    }
  },
  "required": ["eventId", "donorId", "timestamp", "impact", "verification"]
}
```
