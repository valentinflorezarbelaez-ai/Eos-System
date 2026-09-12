# Spec — external-write-gateway (SPEC-0025a / Mission T-gate)

## Requirement: Six Level-2 preconditions fail-closed

The system SHALL require all of REGISTERED, INTAKE_COMPLETE, SPEC_APPROVED,
AUDIT_COMPLETE, OWNER_APPROVAL, LEVEL_2_AUTHORIZED before authorizing an
external write. Missing or false any key SHALL deny with code
`EXTERNAL_WRITE_PRECONDITION_FAILED` naming the missing key(s).

### Scenario: Missing precondition

- GIVEN a hermetic fixture path and receipts missing OWNER_APPROVAL
- WHEN `authorizeExternalWrite` / `assertPreconditions` is invoked
- THEN it denies / throws with code `EXTERNAL_WRITE_PRECONDITION_FAILED`
- AND `missing` includes `OWNER_APPROVAL`

## Requirement: Real Fundacion always denied

Any path matching Documents/Fundacion or a `/Fundacion/` segment (write-barrier
semantics) SHALL be denied with `FUNDACION_ALWAYS_DENY` even when all six
preconditions pass. Real Fundacion Δ=0 SHALL remain intact.

### Scenario: Fundacion-looking path

- GIVEN all six preconditions pass
- WHEN targetPath looks like real Fundacion
- THEN verdict.allowed=false AND reason=`FUNDACION_ALWAYS_DENY`

## Requirement: Hermetic fixture boundary

Writes outside `fixtureRoot` SHALL deny with `OUTSIDE_HERMETIC_FIXTURE`.
`isHermeticFixturePath` SHALL return true only for paths inside fixtureRoot.

## Requirement: Governed write with verifier rollback

`runGovernedWrite` SHALL authorize → applyDiff → runVerifier. On verifier
failure it SHALL call rollbackDiff and fail-closed with
`EXTERNAL_WRITE_VERIFIER_FAILED`. On apply failure it SHALL NOT report success.
On success it SHALL return a receipt including sha256 of content and
PRODUCTION_READY=`NO`.

## Requirement: PRODUCTION_READY remains NO

`EXTERNAL_WRITE_GATEWAY_PRODUCTION_READY` SHALL equal `'NO'`.
`health().kind` SHALL equal `eos-external-write-gateway-l2`.
Module docs SHALL include NON-CLAIM that gateway allow ≠ Fundacion Δ=0 flipped,
fixture ≠ production Fundacion, and Level-2 receipts ≠ PRODUCTION_READY.
