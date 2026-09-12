# Spec — governed-target-flight-sandbox (SPEC-0031 / Mission Z)

## Requirement: Six Level-2 preconditions fail-closed

The system SHALL require all of REGISTERED, INTAKE_COMPLETE, SPEC_APPROVED,
AUDIT_COMPLETE, OWNER_APPROVAL, LEVEL_2_AUTHORIZED before activating a
target-flight sandbox. Missing or false any key SHALL deny with code
`PRECONDITION_FAILED` naming the missing key(s). `PRECONDITION_KEYS` SHALL
be a frozen list of those six names. `evaluate` SHALL return
`{ ok, missing[], PRODUCTION_READY:'NO' }`.

### Scenario: Missing precondition

- GIVEN a hermetic fixture path and preconditions missing LEVEL_2_AUTHORIZED
- WHEN `preflight` is invoked
- THEN it denies with reason `PRECONDITION_FAILED`
- AND `missing` includes `LEVEL_2_AUTHORIZED`
- AND state is `DENIED`

## Requirement: Real Fundacion always denied

Any path matching Documents/Fundacion or a `/Fundacion/` segment (write-barrier
semantics) SHALL be denied with `FUNDACION_ALWAYS_DENY` even when all six
preconditions pass. Mutation-plan paths that look like Fundacion SHALL also
deny. Real Fundacion Δ=0 SHALL remain intact.

### Scenario: Fundacion-looking path

- GIVEN all six preconditions pass
- WHEN targetPath looks like real Fundacion
- THEN ok=false AND reason=`FUNDACION_ALWAYS_DENY`
- AND no mutation is applied to any real tree

## Requirement: Preflight snapshot

`preflight` with all six preconditions and a hermetic fixture SHALL capture a
snapshot `{ sha256, entries, at }` where `sha256` is 64-hex SHA-256 of the
sorted path→content map, then enter `SANDBOX_ACTIVE`.

## Requirement: Ephemeral mutation + HashChainedLedger

`executeFlight` / `run` SHALL apply the mutation only to an ephemeral
in-memory tree (or a temp dir under `os.tmpdir`). It SHALL append
hash-chained ledger events (`prevHash` + `sha256` body, sealEvd style).
Genesis `prevHash` SHALL be 64 zeros. On success state SHALL be `COMMITTED`
and `PRODUCTION_READY` SHALL remain `'NO'`.

## Requirement: Verify fail → atomic rollback

On verifier failure the sandbox SHALL restore the preflight snapshot via the
rollback engine, emit `FLIGHT_ROLLED_BACK`, and enter `ROLLED_BACK`. The
ephemeral tree SHALL match the snapshot entries. Fail-closed: no false
COMMITTED.

## Requirement: Unauthorized write fail-closed

`attemptWrite` or `executeFlight` without an active sandbox SHALL deny with
`FLIGHT_UNAUTHORIZED`. Writes targeting Fundacion paths SHALL deny with
`FUNDACION_ALWAYS_DENY`.

## Requirement: State machine honesty

Transitions SHALL follow
`IDLE → PREFLIGHT → SANDBOX_ACTIVE → MUTATING → VERIFYING → COMMITTED | ROLLED_BACK | ESCALATED_HITL | DENIED`.
`preflight` from a non-IDLE state SHALL throw `FLIGHT_INVALID_STATE`.
A DENIED or ROLLED_BACK flight SHALL NOT report `COMMITTED`.

## Requirement: PRODUCTION_READY remains NO

`TARGET_FLIGHT_PRODUCTION_READY` SHALL equal `'NO'`.
`health().kind` SHALL equal `eos-governed-target-flight-sandbox`.
`health().fundacionDeltaOpened` SHALL be false.
Module docs SHALL include NON-CLAIM that the module is not PRODUCTION_READY,
simulation ≠ Fundacion Δ opened, and sandbox ≠ live Fundacion writes.
