# Specification — Mission BU Multi-Agent Consensus Orchestration Gate & Escalation Fabric (SPEC-0078)

## Requirements (EARS)

### REQ-EARS-BU-01: Hermetic Consensus Proposal Submission
WHEN an action or state transition requires multi-agent agreement,
THE SYSTEM SHALL register a formal consensus proposal with a unique ID, declared action, target,
eligible voter IDs array, and required quorum policy (`UNANIMITY`, `MAJORITY`, or `K_OF_N`),
and seal an initial proposal receipt (`BU-RCPT-*`).

### REQ-EARS-BU-02: Attestation-Verified Vote Casting
WHEN an agent casts a vote (`APPROVE` or `REJECT`) on an open proposal,
THE SYSTEM SHALL verify that the voter is in the declared eligible voters list and is attested,
record the vote with timestamp and rationale, and reject unauthorized voters with `UNAUTHORIZED_VOTER_DENY`.

### REQ-EARS-BU-03: Quorum Evaluation & Fail-Closed Denial
WHEN consensus evaluation is requested on an active proposal,
THE SYSTEM SHALL compute voter tally against the required quorum policy,
returning `CONSENSUS_APPROVED` if the threshold is met,
or `QUORUM_NOT_MET_DENY` / `PROPOSAL_REJECTED_DENY` if the threshold fails or rejections dominate.

### REQ-EARS-BU-04: Deadlock Escalation Path
IF a proposal fails to reach quorum within the evaluation window or splits in an unresolvable tie,
THE SYSTEM SHALL allow authorized escalation to higher-clearance agents or operator keys,
sealing an `ESCALATED` decision receipt and logging the escalation rationale.

### REQ-EARS-BU-05: Cryptographically Sealed Consensus Receipts
WHEN a consensus decision is reached, denied, or escalated,
THE SYSTEM SHALL emit an immutable sealed receipt (`BU-RCPT-*`) containing proposal ID,
quorum policy, vote tally digest, consensus outcome, timestamp, and SHA-256 hash over canonical fields.

## BDD Acceptance Criteria

### SCENARIO 1: Successful 2-of-3 Quorum Consensus
GIVEN an open proposal requiring 2-of-3 votes (`K_OF_N` with k=2)
WHEN agent 1 and agent 2 cast `APPROVE` votes
THEN consensus evaluation yields `CONSENSUS_APPROVED`
AND a sealed receipt starting with `BU-RCPT-` and status `CONSENSUS_APPROVED` is emitted.

### SCENARIO 2: Rejection on Quorum Failure
GIVEN an open proposal requiring `UNANIMITY` among 3 agents
WHEN agent 1 and agent 2 vote `APPROVE` but agent 3 votes `REJECT`
THEN consensus evaluation yields `PROPOSAL_REJECTED_DENY`
AND the proposal state is locked as rejected.

### SCENARIO 3: Deadlock Escalation
GIVEN a proposal with 2 eligible voters split 1 `APPROVE` and 1 `REJECT`
WHEN `escalateDecision` is invoked with an authorized escalation key
THEN the decision transitions to `ESCALATED`
AND an escalation receipt is sealed under evidence custody.
