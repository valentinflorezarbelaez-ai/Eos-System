# [SPEC-EOS-011]: Mathematical Property Falsifier & NASA/JPL Safety-Critical Verification Engine (`eos falsify` / `eos safety`)

* **Domain / Module:** `src/core/formal/property-based-falsifier.js`, `src/core/formal/jpl-safety-auditor.js` & `src/cli/mission-cli.js`
* **Status:** `APPROVED`
* **Traceability:** `GOV-FORMAL-001` ➔ `SPEC-EOS-011` ➔ `PLAN-EOS-011` ➔ `TASKS-EOS-011`

---

## 1. Problem Statement & Operational Doctrine

Traditional software testing relies on hand-crafted happy-path examples and unit fixtures, which cover less than 1% of the potential input state-space. In mission-critical systems (NASA/JPL spacecraft, AWS Automated Reasoning, DO-178C avionics), correctness must be mathematically proven across unbounded adversarial combinations.

Under the **NASA/JPL Laboratory for Reliable Software (Gerard Holzmann) Standards** and **Popperian Falsification Doctrine**:
1. **Property-Based Invariant Falsification**: System behaviors are modeled as mathematical invariants (idempotency, monotonicity, state conservation) and subjected to automated stochastic fuzzing across 1,000–10,000 combinatorial edge-case payloads.
2. **Automated Counter-Example Shrinking**: When an invariant is falsified, the engine deterministically simplifies and bisects the failing input until finding the minimal reproducible bug envelope.
3. **NASA/JPL 10 Safety Rules Compliance**:
   - Rule 1 & 2: Simple, strictly bounded loop bounds (no infinite loops or unbounded recursions).
   - Rule 5: Assertion density (safety-critical domain functions must contain assertions verifying preconditions and postconditions).
   - Rule 7: Strict return value checking (non-void calls must be evaluated).

---

## 2. Architectural Topology

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                 DOMAIN ENTITY / FUNCTION UNDER VERIFICATION             │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────────────┐
│              SPEC-EOS-011A            │ │              SPEC-EOS-011B            │
│       PROPERTY-BASED FALSIFIER        │ │         NASA/JPL SAFETY AUDITOR       │
│            (eos falsify)              │ │              (eos safety)             │
└──────────────────┬────────────────────┘ └──────────────────┬────────────────────┘
                   │                                         │
     ┌─────────────┴─────────────┐             ┌─────────────┴─────────────┐
     ▼                           ▼             ▼                           ▼
┌──────────────┐          ┌────────────┐┌──────────────┐          ┌──────────────┐
│ Invariant    │          │ Automated  ││ Bounded Loop │          │ Assertion    │
│ Fuzzer (10k) │          │ Shrinking  ││ & Recursion  │          │ Density &    │
│ Combinatorial│          │ Minimal Bug││ Guard        │          │ Return Value │
└──────────────┘          └────────────┘└──────────────┘          └──────────────┘
```

---

## 3. Functional Requirements (Formal EARS Syntax)

### FR-PBF-001: Property Invariant Fuzzing (Ubiquitous)
* **EARS**: `EL SISTEMA PropertyBasedFalsifier evaluará la función o modelo de dominio contra predicados invariantes a lo largo de N iteraciones estocásticas con casos límite (null bytes, desbordamientos numéricos, cadenas Unicode extremas y grafos cíclicos).`

### FR-PBF-002: Deterministic Counter-Example Shrinking (Event-Driven)
* **EARS**: `CUANDO un predicado invariante sea falsificado por una entrada compleja, EL SISTEMA reducirá iterativamente los números, cadenas o arreglos hasta aislar el contraejemplo mínimo reproducible.`

### FR-PBF-003: Algebraic Property Verification (Event-Driven)
* **EARS**: `CUANDO se evalúe una transformación de datos, EL SISTEMA verificará matemáticamente propiedades de idempotencia (f(f(x)) === f(x)) y preservación de estado.`

### FR-JPL-001: Bounded Loop & Recursion Auditing (Ubiquitous)
* **EARS**: `EL SISTEMA JplSafetyAuditor auditará el código fuente garantizando que todo bucle while o for posea una cota superior determinista y no existan recursiones infinitas.`

### FR-JPL-002: Assertion Density Enforcement (Event-Driven)
* **EARS**: `CUANDO se audite un módulo clasificado como crítico, EL SISTEMA verificará una densidad mínima de 2 aserciones o validaciones explícitas por función exportada.`

---

## 4. Acceptance Criteria (BDD)

```gherkin
ESCENARIO: Falsificación estocástica de invariante con shrinking exitoso
  DADO una función que falla ante números mayores a 1000 y pares
  CUANDO se ejecuta checkProperty() con 500 iteraciones
  ENTONCES el sistema detecta la violación de la invariante
  Y el algoritmo de shrinking reduce el contraejemplo al valor mínimo 1002

ESCENARIO: Verificación de idempotencia algebraica
  DADO un serializador o función de sanitización
  CUANDO se evalúa la propiedad assertIdempotent()
  ENTONCES f(f(x)) es idéntico a f(x) en el 100% de las 1000 ejecuciones

ESCENARIO: Auditoría de seguridad NASA/JPL detecta bucle no acotado
  DADO un archivo de código con un bucle while (true) sin límite superior
  CUANDO se ejecuta auditFile(filePath)
  ENTONCES el JplSafetyAuditor emite una advertencia de violación de la Regla 2 del JPL
  Y el JPL Compliance Index refleja la penalización correspondiente
```
