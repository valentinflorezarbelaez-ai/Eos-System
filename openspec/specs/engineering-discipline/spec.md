# Engineering discipline (current behavior)

Capability: routing and evidence rules adopted by ADR-0010. This is the main-spec target for OpenSpec deltas. It does not implement Control Plane engines.

## Requirements

### Requirement: Organic routing is explicit

The Control Plane SHALL distinguish DIRECT work from SDD (LIDR Specboot / OpenSpec) using ADR-0010. File/diff size alone MUST NOT force SDD ceremony.

#### Scenario: Substantial change uses SDD

- GIVEN a new subsystem, accepted proposal, or explicit human request for OpenSpec
- WHEN an agent starts implementation
- THEN the LIDR cycle (`/enrich-us` → `/ff` or `/propose` → `/apply` → `/verify` → `/adversarial-review` → `/archive` → `/commit`) is the default ceremony

#### Scenario: Trivial local fix may be DIRECT

- GIVEN a human-requested local docs or already-scoped fix with no new contract
- WHEN the agent applies the change
- THEN SDD ceremony is optional and MUST NOT be required solely because the diff is large

### Requirement: Independent review is not delivery

RDD outcomes are INFORMATIONAL. Review MUST NOT authorize merge, release, or external writes.

#### Scenario: Adversarial review passes

- GIVEN an `/adversarial-review` with no findings
- WHEN delivery is considered
- THEN commit-to-main, PR merge, release, and Fundacion writes still require human / HITL / write-barrier authority
