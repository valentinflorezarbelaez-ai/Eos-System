# Delta — sensor-mutation-fortify (Mission B)

## ADDED Requirements

### Requirement: V5 custody identities reject format/ZW spoof

The system SHALL treat builder/verifier identities that differ only by Unicode format, zero-width, or control characters as identical for custody disjunction, and SHALL fail-closed with `BUILDER_EQUALS_VERIFIER_VIOLATION`.

#### Scenario: ZWSP spoof collision
- GIVEN builder_id `agent` and verifier_id `agent` + U+200B
- WHEN `assertBuilderVerifierDisjunction` runs
- THEN it throws `BUILDER_EQUALS_VERIFIER_VIOLATION`

### Requirement: U7 must-not-invent fails closed on invented checklist paths

The SpecBoot DEFER stubs lock SHALL fail-closed when any forbidden SpecBoot checklist path exists under the audited root (IGNORE / S2 TPC must-not-invent).

#### Scenario: Temp invented frontend-standards
- GIVEN a temp root containing `docs/frontend-standards.md`
- WHEN `auditSpecbootDeferStubsLock` runs with stub checks enabled
- THEN `ok` is false and a must-not-invent failure is recorded

### Requirement: T8 Dirty DEFER gate remains NON-MUTATING

The Dirty DEFER triage gate SHALL report `mutating: false`, SHALL NOT modify repository tracked content when green, and the lock SHALL fail-closed when ritual text loses the `NON-MUTATING` needle.

#### Scenario: Gate green leaves tree unchanged
- GIVEN a green T8 lock
- WHEN the gate CLI runs
- THEN exit code is 0, payload.mutating is false, and a pre/post snapshot of representative tracked paths is unchanged
