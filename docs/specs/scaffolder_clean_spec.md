# LIVING SPECIFICATION: CLEAN ARCHITECTURE SCAFFOLDER
**ID de Misión:** `MIS-SCAFFOLD-001`  
**Estado:** `VALIDATED`  
**Fecha:** 2026-08-27  

---

## 1. Contexto y Objetivos
El `EOSScaffolderClean` es el generador determinista que produce de forma atómica la tríada indivisible de desarrollo en EOS y sella cada operación en el Ledger inmutable mediante `EOSKernel`:
1. La especificación formal en Markdown bajo sintaxis EARS (`docs/specs/[nombre]_spec.md`).
2. El código fuente puro en Clean / Hexagonal Architecture (`src/core/[nombre].js`).
3. La suite de pruebas unitarias TDD en rojo (`tests/[nombre].test.js`).
4. El recibo criptográfico SHA-256 persistido en el Ledger de Engram (`registro.hash`).

---

## 2. Requerimientos Funcionales en Sintaxis EARS

### [REQ-EARS-SC-01] Generación Atómica de la Tríada de Desarrollo
* **CUANDO** el sistema recibe una solicitud de andamiaje con un nombre de componente válido en formato kebab-case, **EL SISTEMA DEBE** crear simultáneamente el archivo de especificación (.md), el código fuente (.js) y la suite de pruebas (.test.js).

### [REQ-EARS-SC-02] Protección Defensiva Contra Colisiones y Sobreescritura
* **SI** cualquiera de los tres archivos de la tríada ya existe en el disco, **ENTONCES EL SISTEMA DEBE** abortar inmediatamente la operación arrojando una excepción `SCAFFOLDER VIOLATION` sin mutar ningún archivo existente.

### [REQ-EARS-SC-03] Validación de Formato de Nombre
* **SI** el nombre del componente no cumple con el patrón kebab-case o está vacío, **ENTONCES EL SISTEMA DEBE** rechazar la solicitud con error `SCAFFOLDER FAULT`.

### [REQ-EARS-SC-04] Sellado Criptográfico en Ledger Inmutable
* **CUANDO** el sistema consolida exitosamente la tríada de archivos de un nuevo módulo en el disco, **EL SISTEMA DEBE** invocar el método `registrarTransaccionLedger` del Kernel para generar y sellar un recibo criptográfico SHA-256 en la memoria persistente.

---

## 3. Criterios de Aceptación BDD (GIVEN-WHEN-THEN)

```gherkin
ESCENARIO: Generación exitosa de la tríada con sellado telemétrico
  DADO un nombre de componente válido "telemetry-logger" sin colisiones previas
  CUANDO el EOSScaffolderClean ejecuta la creación
  ENTONCES crea simultáneamente los 3 archivos
  Y emite estado "GENERATED_AND_LOCKED" con su hashLedger sha256-...

ESCENARIO: Bloqueo inmediato ante colisión de archivos
  DADO un componente que ya existe físicamente en el disco
  CUANDO el EOSScaffolderClean intenta generar el andamio
  ENTONCES arroja error "SCAFFOLDER VIOLATION"
  Y ningún archivo es sobreescrito ni sellado en el Ledger
```
