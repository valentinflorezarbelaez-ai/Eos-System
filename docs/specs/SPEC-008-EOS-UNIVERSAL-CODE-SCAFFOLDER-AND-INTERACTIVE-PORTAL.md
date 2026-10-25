# SPECIFICATION: SPEC-008
## EOS Universal Autonomous Code Scaffolder & Interactive Live Web Lab

---

### 1. Specification Metadata
* **Specification ID:** `SPEC-008`
* **Parent Intake:** `INTAKE-008`
* **Status:** `SPECIFICATION_APPROVED`
* **Standard:** IEEE 830 / ISO 29148 / EARS
* **Authorizer:** Lead Architect
* **Timestamp:** 2026-10-25T02:16:00-05:00

---

### 2. Functional Requirements (EARS Syntax)

#### FR-001 (Event-Driven): Dynamic Code Scaffolding
* `CUANDO` el operador o el motor invoque la síntesis de código para una instrucción de desarrollo arbitraria, `EL SISTEMA` generará un paquete hexagonal completo que incluirá una Entidad de Dominio inmutable, una Interfaz de Puerto, un Caso de Uso de Aplicación con validación de invariantes, un Adaptador In-Memory y una Suite de Tests Deterministas.

#### FR-002 (Event-Driven): CLI Scaffolding Flag
* `CUANDO` se ejecute el comando `eos develop "<prompt>" --scaffold`, `EL SISTEMA` escribirá físicamente los artefactos de código y especificación en el directorio de salida, validará su sintaxis TypeScript y emitirá un registro de evidencia con sello SHA-256.

#### FR-003 (State-Driven): Interactive Live Terminal Prompt Bar
* `MIENTRAS` el usuario interactúe con el portal público en `#consola`, `EL SISTEMA` proporcionará un campo de entrada interactivo y chips de prueba rápida para ejecutar cualquier directriz de desarrollo en tiempo real.

#### FR-004 (Event-Driven): Real-Time 21-Step Pipeline Execution
* `CUANDO` el usuario envíe una instrucción en el portal interactivo, `EL SISTEMA` ejecutará y renderizará visualmente los 21 pasos de la tubería maestra de ingeniería de forma secuencial y fluida a 60 FPS, derivando requisitos EARS y escenarios BDD específicos del texto ingresado.

#### FR-005 (Event-Driven): Interactive Code Artifact Preview Tabs
* `CUANDO` finalice la ejecución de la tubería en el portal interactivo, `EL SISTEMA` habilitará pestañas interactivas de inspección que permitirán alternar entre el resumen del pipeline, los artefactos de especificación (EARS / BDD / DAG) y el código fuente TypeScript sintetizado (Dominio, Caso de Uso y Tests).

#### FR-006 (Ubiquitous): SHA-256 Merkle Proof Attestation
* `EL SISTEMA` calculará criptográficamente la raíz Merkle y el hash SHA-256 de cada desarrollo sintetizado utilizando `crypto.subtle.digest` en el navegador y `node:crypto` en el CLI, garantizando la inmutabilidad y trazabilidad epistémica.

---

### 3. Acceptance Criteria (BDD)

```gherkin
ESCENARIO: SCENARIO-01 - Síntesis Completa de Código Hexagonal desde CLI
  DADO que el CLI de EOS se invoca con 'develop "Crear motor de subastas con anti-sniping" --scaffold'
  CUANDO el motor procesa la directriz y activa el CodeScaffolderService
  ENTONCES se generan los archivos de Dominio, Caso de Uso, Puerto, Adaptador y Test
  Y todos los archivos compilan en TypeScript 5.7 strict sin errores
  Y la ejecución de la prueba unitaria finaliza con Exit Code 0.

ESCENARIO: SCENARIO-02 - Ejecución Interactiva con Prompt Personalizado en el Portal Web
  DADO que el usuario navega a la sección #consola en 'https://eos-system-ten.vercel.app/'
  CUANDO el usuario escribe "Sistema de microcréditos descentralizados" y pulsa "EJECUTAR 21 PASOS"
  ENTONCES la terminal muestra la ejecución secuencial de los 21 pasos con la directriz del usuario
  Y el hash SHA-256 de atestación se calcula y sella dinámicamente
  Y las pestañas de artefactos permiten visualizar el código generado y la especificación EARS.

ESCENARIO: SCENARIO-03 - Presets de Inspiración Instantánea
  DADO que el usuario hace clic en el chip de preset "💳 Pagos Stripe"
  CUANDO el chip se activa
  ENTONCES el texto del preset se inserta automáticamente en el campo de entrada
  Y la tubería se ejecuta de inmediato mostrando la especificación de eventos y persistencia transaccional.
```

---

### 4. Non-Functional Requirements (NFR)
1. **Performance**: El pipeline interactivo en el portal web debe inicializarse en < 50ms y ejecutar las transiciones de pasos a 60 FPS.
2. **Security**: Cero inyección de código o XSS a través del input de texto (sanitización de entidades HTML antes de la inserción en el DOM).
3. **Accessibility**: El input de texto y los botones deben poseer atributos `aria-label`, soporte completo de teclado (Enter / Escape) y contraste WCAG 2.1 AA.
4. **Hermeticity**: El código sintetizado en Layer 0 no debe depender de ninguna librería externa de runtime.
