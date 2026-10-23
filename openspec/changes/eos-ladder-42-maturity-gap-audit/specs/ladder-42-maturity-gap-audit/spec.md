# Spec — Ladder 42 Maturity Gap Audit

**PRODUCTION_READY:** NO · **Ladder ceiling:** 41 CLOSED · **Next free ordinals:** SPEC-0176 / ADR-0161

## Requirement: Axis selection is evidence-based

The audit SHALL justify the proposed axis with a reproducible measurement of family coverage in `src/core`, and SHALL name every rejected alternative with its reason.

### Scenario: candidate axis with existing coverage
- **WHEN** a candidate family shows non-zero module coverage already delivered by a CLOSED ladder
- **THEN** the audit SHALL reject the axis and record why

### Scenario: two qualifying candidates
- **WHEN** two zero-coverage candidates qualify
- **THEN** the audit SHALL prefer the candidate that is a precondition of the other, and SHALL defer (not reject) the dependent one

## Requirement: The audit consumes no satellite ordinal

The audit SHALL NOT assign SPEC or ADR ordinals to satellites, open L42, or move the freeze pin.

### Scenario: premature ordering
- **WHEN** the audit is authored
- **THEN** `SPEC-0176` and `ADR-0161` SHALL remain free
- **AND** no `L42 OPEN` statement SHALL appear in the release SSOT

## Requirement: Ratification is explicit

ADR-0160 SHALL remain `Proposed` until the Product Owner ratifies it.

### Scenario: agent-authored decision
- **WHEN** an agent proposes the axis
- **THEN** the ADR status SHALL be `Proposed — pending Product Owner ratification`
- **AND** no downstream satellite spec SHALL be authored before ratification
