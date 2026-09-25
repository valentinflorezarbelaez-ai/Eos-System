# Specification — Mission DS: Contract-First Formal Data Contract Notary Port (SPEC-0129)

## 1. Functional Requirements (EARS)

### FR-01: Schema Drift Prevention (Event-Driven)
CUANDO un plan o payload presente discordancia con el contrato canónico registrado (`schemaDriftDetected === true`), EL SISTEMA denegará la notarización con `SCHEMA_DRIFT_DETECTED`.

### FR-02: Uncontracted Field Rejection (Event-Driven)
CUANDO un payload contenga campos no declarados en el contrato formal (`uncontractedFieldsCount > 0` o `hasUncontractedFields === true`), EL SISTEMA denegará fail-closed con `UNCONTRACTED_FIELDS_DETECTED`.

### FR-03: Layer 0 Purity (Ubiquitous)
EL SISTEMA garantizará que el notario de contratos de datos no dependa de bibliotecas externas npm (`NODE_BUILTINS_ONLY`).

### FR-04: Write Barrier Protection (Ubiquitous)
EL SISTEMA denegará de manera fail-closed cualquier intento de escritura o redirección hacia rutas de Fundacion (`FUNDACION_ALWAYS_DENY`, Δ=0).

### FR-05: Credential Security (Ubiquitous)
EL SISTEMA denegará cualquier plan o recibo que contenga tokens o credenciales sensibles en texto plano (Law VI).

## 2. BDD Acceptance Criteria

```gherkin
ESCENARIO: Notarización exitosa de contrato formal en modo ACTIVE
  DADO un plan con planId, changeId y un contractReport con status: "VALIDATED" y zero drift
  CUANDO el DataContractNotaryPort ejecuta govern() en modo ACTIVE
  ENTONCES el resultado es PASS
  Y se emite un recibo DS-RCPT-* sellado con contractDigest válido
  Y el recibo preserva productionReady: "NO" y fundacionDelta: 0

ESCENARIO: Denegación por campos no declarados en el contrato
  DADO un plan con un contractReport que contiene uncontractedFieldsCount > 0
  CUANDO el DataContractNotaryPort ejecuta govern()
  ENTONCES el resultado es DENY con código UNCONTRACTED_FIELDS_DETECTED
  Y no se emite ningún recibo con decisión PASS
```
