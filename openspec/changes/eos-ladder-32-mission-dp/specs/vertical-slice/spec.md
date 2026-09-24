# Specification — Mission DP: Sovereign Vertical Slice & Screaming Architecture Port (SPEC-0126)

## 1. Functional Requirements (EARS)

### FR-01: Vertical Slice Cohesion (Ubiquitous)
EL SISTEMA verificará que los módulos de dominio Layer 0 estén organizados en vertical slices cohesivos por caso de uso.

### FR-02: Cross-Slice Leakage Denial (Event-Driven)
CUANDO un slice vertical intente importar directamente internos privados de otro slice sin utilizar un puerto público abstracto, EL SISTEMA denegará la operación fail-closed con `CROSS_SLICE_LEAKAGE_DETECTED`.

### FR-03: Layer 0 Purity (Ubiquitous)
EL SISTEMA garantizará que los slices de dominio Layer 0 no contengan dependencias npm externas (`NODE_BUILTINS_ONLY`).

### FR-04: Write Barrier Protection (Ubiquitous)
EL SISTEMA denegará de manera fail-closed cualquier intento de escritura o redirección hacia rutas de Fundacion (`FUNDACION_ALWAYS_DENY`, Δ=0).

### FR-05: Credential Security (Ubiquitous)
EL SISTEMA denegará cualquier plan o recibo que contenga tokens o credenciales sensibles en texto plano (Law VI).

## 2. BDD Acceptance Criteria

```gherkin
ESCENARIO: Validación exitosa de vertical slice en modo ACTIVE
  DADO un plan con planId, changeId y un sliceReport sin fugas ni dependencias externas
  CUANDO el VerticalSlicePort ejecuta govern() en modo ACTIVE
  ENTONCES el resultado es PASS
  Y se emite un recibo DP-RCPT-* sellado con sliceDigest válido
  Y el recibo preserva productionReady: "NO" y fundacionDelta: 0

ESCENARIO: Denegación de fuga entre slices cruzados
  DADO un plan con un sliceReport que contiene crossSliceLeaksCount > 0
  CUANDO el VerticalSlicePort ejecuta govern()
  ENTONCES el resultado es DENY con código CROSS_SLICE_LEAKAGE_DETECTED
  Y no se emite ningún recibo con decisión PASS
```
