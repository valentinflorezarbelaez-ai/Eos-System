# Specification — Mission DT: Ladder 32 CI Seam-Pack Consolidation & Closeout (SPEC-0130)

## 1. Functional Requirements (EARS)

### FR-01: End-to-End Upstream Validation (Event-Driven)
CUANDO el Ladder32SeamPort reciba una solicitud de consolidación en modo ACTIVE, EL SISTEMA verificará que los cuatro recibos satélites upstream (DP, DQ, DR, DS) estén presentes, sean válidos y tengan decisión PASS.

### FR-02: Cryptographic Seam Digest (Ubiquitous)
EL SISTEMA calculará y sellará en el recibo `DT-RCPT-*` un hash canónico SHA-256 (`upstreamDigest`) que une criptográficamente los recibos satélites upstream.

### FR-03: Layer 0 Purity (Ubiquitous)
EL SISTEMA garantizará que el puerto seam-pack de Ladder 32 no dependa de bibliotecas externas npm (`NODE_BUILTINS_ONLY`).

### FR-04: Write Barrier Protection (Ubiquitous)
EL SISTEMA denegará de manera fail-closed cualquier intento de escritura o redirección hacia rutas de Fundacion (`FUNDACION_ALWAYS_DENY`, Δ=0).

### FR-05: Credential Security (Ubiquitous)
EL SISTEMA denegará cualquier plan o recibo que contenga tokens o credenciales sensibles en texto plano (Law VI).

## 2. BDD Acceptance Criteria

```gherkin
ESCENARIO: Consolidación exitosa de Ladder 32 en modo ACTIVE
  DADO un plan con planId, changeId y enlaces a recibos válidos de DP, DQ, DR y DS
  CUANDO el Ladder32SeamPort ejecuta govern() en modo ACTIVE
  ENTONCES el resultado es PASS
  Y se emite un recibo DT-RCPT-* sellado con upstreamDigest válido
  Y el recibo preserva productionReady: "NO" y fundacionDelta: 0
  Y Ladder 32 queda formalmente sellado como CLOSED_FOR_LOCAL_GOVERNED_USE
```
