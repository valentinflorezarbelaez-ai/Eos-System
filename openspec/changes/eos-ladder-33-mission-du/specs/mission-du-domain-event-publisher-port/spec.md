# Spec — mission-du-domain-event-publisher-port (SPEC-0131)

## Requirements

### Requirement: Seal domain event publish receipts

The system SHALL seal pure domain-event publish decisions as `DU-RCPT-*` receipts with a nine-field SHA-256 body and soft-observe freeze pin `b205ce8c`.

#### Scenario: Happy-path publish

- GIVEN a plan with planId, changeId, ritualMode ACTIVE, and a domainEvent with eventType, aggregateId, and non-empty payload
- WHEN the port governs the plan
- THEN decision is PASS and a `DU-RCPT-*` receipt is sealed with fundacionDelta=0 and productionReady=NO

#### Scenario: Outbox dispatch refused

- GIVEN a plan that requests outbox dispatch
- WHEN the policy gate evaluates preconditions
- THEN decision is DENY with code OUTBOX_DISPATCH_FORBIDDEN

#### Scenario: Ladder reopen refused

- GIVEN a plan that attempts to reopen L30, L31, or L32
- WHEN the policy gate evaluates preconditions
- THEN decision is DENY with the corresponding reopen-forbidden code

#### Scenario: L33 auto-close refused

- GIVEN a plan that attempts to auto-close Ladder 33
- WHEN the policy gate evaluates preconditions
- THEN decision is DENY with code L33_AUTO_CLOSE_FORBIDDEN

## Non-requirements

- Outbox dispatch (DV / SPEC-0132)
- PRODUCTION_READY flip
- Tip-pin rewrite / tip-refresh
- L33 closeout
