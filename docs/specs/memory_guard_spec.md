# ESPECIFICACIÓN FORMAL: EOS MEMORY GUARD
**ID de Misión:** `MIS-MEM-GUARD-001`  
**Sintaxis:** EARS (Easy Approach to Requirements Syntax) & BDD Gherkin  
**Estado:** `SPECIFICATION_APPROVED`  
**Fecha:** 2026-08-27  

---

## 1. Contexto y Objetivos
El `EOSMemoryGuard` es el validador criptográfico y estructural que intercepta todos los payloads destinados al Ledger persistente de Engram MCP, previniendo colisiones de hash, corrupción estructural o inserciones de transacciones no autorizadas.

---

## 2. Requerimientos Funcionales en Sintaxis EARS

### [REQ-EARS-MG-01] Validación Ubicua de Integridad Criptográfica
* **EL SISTEMA DEBE** verificar que todo payload de transacción contenga un identificador de misión (`idMision`), un timestamp ISO 8601 válido y un hash SHA-256 generado determinísticamente.

### [REQ-EARS-MG-02] Validación Event-Driven de Estructura de Payload
* **CUANDO** se envíe un registro para su inserción en el Ledger, **EL SISTEMA DEBE** validar que los campos requeridos (`idMision`, `tipo`, `estado`, `payload`) cumplan estrictamente con el contrato de datos.

### [REQ-EARS-MG-03] Manejo Defensivo y Rechazo de Corrupción
* **SI** se detecta una discrepancia entre el hash SHA-256 declarado y el hash calculado del contenido, **ENTONCES EL SISTEMA DEBE** arrojar una excepción `PAYLOAD_CORRUPTED` y rechazar la inserción sin mutaciones residuales.

### [REQ-EARS-MG-04] Detección de Colisiones y Mutaciones Ilegales
* **SI** se intenta registrar una transacción con un hash idéntico pero diferente carga útil, o un estado inválido, **ENTONCES EL SISTEMA DEBE** arrojar `ILLEGAL_STRUCTURAL_MUTATION`.

---

## 3. Criterios de Aceptación BDD (GIVEN-WHEN-THEN)

```gherkin
ESCENARIO: Validación exitosa de payload íntegro para el Ledger
  DADO un payload con idMision "MIS-TEST-001", metadata válida y hash SHA-256 coincidente
  CUANDO el EOSMemoryGuard audita el payload
  ENTONCES retorna { valido: true, hashVerificado: "<hash>", timestamp: "<iso>" }
  Y autoriza la transmisión al Ledger de Engram

ESCENARIO: Rechazo tajante por manipulación o discrepancia de hash
  DADO un payload con datos modificados respecto al hash declarado
  CUANDO el EOSMemoryGuard ejecuta la verificación
  ENTONCES arroja error "PAYLOAD_CORRUPTED: SHA-256 mismatch"
  Y la transacción es bloqueada

ESCENARIO: Rechazo por campos estructurales faltantes
  DADO un payload que carece de idMision o estado
  CUANDO el EOSMemoryGuard analiza la estructura
  ENTONCES arroja error "INVALID_STRUCTURE: Missing required fields"
```
