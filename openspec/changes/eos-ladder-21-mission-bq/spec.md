# Specification — Mission BQ: Ladder 21 CI Seam-Pack Consolidation & Closeout (SPEC-0074)

## EARS Requirements

### Event-Driven
- **WHEN** Ladder 21 satellites BM–BP exist on main, **THE SYSTEM SHALL** require their npm test scripts in CI seam-pack fail-closed.
- **WHEN** Ladder 21 closeout is executed, **THE SYSTEM SHALL** verify all 4 satellites are MEASURED and mark Ladder 21 CLOSED_FOR_LOCAL_GOVERNED_USE.

### Error-Condition (Fail-Closed)
- **IF** any BM–BP satellite test fails or receipt prefix is missing, **THE SYSTEM SHALL** fail the seam-pack execution without continue-on-error.

### State-Driven
- **MIENTRAS** Ladder 21 closeout is recorded, **THE SYSTEM SHALL** keep PRODUCTION_READY=NO, Fundacion Δ=0, and enforce NEVER REOPEN L17–L21.

## Acceptance Criteria (BDD)

```gherkin
ESCENARIO: Ejecución completa y limpia del seam-pack de Ladder 21
  DADO que los satélites BM, BN, BO y BP están presentes en el control plane
  CUANDO se ejecuta "npm run test:ladder21-pack"
  ENTONCES todos los satélites corren y pasan al 100%
  Y el dictamen final es VERIFIED
  Y no se producen violaciones de aislamiento ni leaks de Law VI.
```
